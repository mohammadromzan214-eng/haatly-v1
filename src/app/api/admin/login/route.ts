import { NextRequest, NextResponse } from "next/server";
import {
  AdminAuthConfigurationError,
  createAdminSession,
  getAdminSessionCookieName,
  getAdminSessionTtlSeconds,
} from "@/lib/admin-auth";
import { authenticateAdminCredentials } from "@/lib/admin-access";
import type { AdminLoginIdentity } from "@/lib/admin-types";

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 10_000;
const MAX_LOGIN_BODY_LENGTH = 4096;
const attempts = new Map<string, { count: number; windowStartedAt: number; blockedUntil: number }>();

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = request.headers.get("x-nf-client-connection-ip")
    ?? request.headers.get("x-real-ip")
    ?? forwarded
    ?? "unknown";
  return address.slice(0, 128);
}

function isRateLimited(key: string, now: number) {
  const state = attempts.get(key);
  if (!state) return false;
  if (state.blockedUntil > now) return true;
  if (now - state.windowStartedAt >= ATTEMPT_WINDOW_MS || state.blockedUntil > 0) {
    attempts.delete(key);
  }
  return false;
}

function recordFailedAttempt(key: string, now: number) {
  const previous = attempts.get(key);
  const state = previous && now - previous.windowStartedAt < ATTEMPT_WINDOW_MS
    ? previous
    : { count: 0, windowStartedAt: now, blockedUntil: 0 };
  const count = state.count + 1;
  const blockedUntil = count >= MAX_FAILED_ATTEMPTS ? now + ATTEMPT_WINDOW_MS : 0;

  if (!previous && attempts.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = attempts.keys().next().value;
    if (oldestKey) attempts.delete(oldestKey);
  }
  attempts.set(key, { ...state, count, blockedUntil });
  return blockedUntil > now;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin && process.env.NODE_ENV === "production") {
    return jsonError("Request rejected.", 403);
  }
  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return jsonError("Request rejected.", 403);
      }
    } catch {
      return jsonError("Request rejected.", 403);
    }
  }

  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    return jsonError("Invalid request.", 400);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_LOGIN_BODY_LENGTH) {
    return jsonError("Invalid request.", 400);
  }

  let value: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_LOGIN_BODY_LENGTH) return jsonError("Invalid request.", 400);
    value = JSON.parse(text);
  } catch {
    return jsonError("Invalid request.", 400);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return jsonError("Invalid request.", 400);
  }
  const body = value as { email?: unknown; password?: unknown };
  if (typeof body.email !== "string" || body.email.length > 254
      || typeof body.password !== "string" || body.password.length > 1024) {
    return jsonError("Enter a valid email address and password.", 400);
  }

  const clientKey = getClientKey(request);
  const now = Date.now();
  if (isRateLimited(clientKey, now)) {
    return jsonError("Too many attempts. Try again later.", 429);
  }

  let identity: AdminLoginIdentity | null;
  try {
    identity = await authenticateAdminCredentials(body.email, body.password);
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) {
      return jsonError("Admin authentication is not configured.", 503);
    }
    console.error("Could not authenticate admin.", error);
    return jsonError("Admin sign-in is temporarily unavailable.", 503);
  }

  if (!identity) {
    const blocked = recordFailedAttempt(clientKey, now);
    return jsonError(
      blocked ? "Too many attempts. Try again later." : "Invalid email or password.",
      blocked ? 429 : 401,
    );
  }

  attempts.delete(clientKey);
  const response = NextResponse.json({ ok: true, role: identity.role }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(getAdminSessionCookieName(), await createAdminSession(identity), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getAdminSessionTtlSeconds(),
  });
  return response;
}
