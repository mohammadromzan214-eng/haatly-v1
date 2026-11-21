import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionCookieName } from "@/lib/customer-auth";
import { hashCustomerPassword } from "@/lib/db/customer-repository";
import { resetCustomerPassword } from "@/lib/db/password-reset-repository";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 10;
const MAX_TRACKED_CLIENTS = 10_000;
const MAX_REQUEST_BODY_LENGTH = 4096;
const attempts = new Map<string, { count: number; resetAt: number }>();

function jsonResponse(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("x-nf-client-connection-ip")
    ?? request.headers.get("x-real-ip")
    ?? forwarded
    ?? "unknown"
  ).slice(0, 128);
}

function isRateLimited(key: string, now: number) {
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS_PER_WINDOW) return true;

  const state = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (!current && attempts.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = attempts.keys().next().value;
    if (oldestKey) attempts.delete(oldestKey);
  }
  attempts.set(key, { count: state.count + 1, resetAt: state.resetAt });
  return false;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin && process.env.NODE_ENV === "production") {
    return jsonResponse({ error: "Request rejected." }, 403);
  }
  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return jsonResponse({ error: "Request rejected." }, 403);
      }
    } catch {
      return jsonResponse({ error: "Request rejected." }, 403);
    }
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return jsonResponse({ error: "Invalid request." }, 400);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_LENGTH) {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  let value: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_REQUEST_BODY_LENGTH) return jsonResponse({ error: "Invalid request." }, 400);
    value = JSON.parse(text);
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  const body = value as { token?: unknown; password?: unknown };
  if (typeof body.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) {
    return jsonResponse({ error: "This password reset link is invalid or has expired." }, 400);
  }
  if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) {
    return jsonResponse({ error: "Password must be between 8 and 128 characters." }, 400);
  }
  if (isRateLimited(getClientKey(request), Date.now())) {
    return jsonResponse({ error: "Too many attempts. Try again later." }, 429);
  }

  const tokenHash = createHash("sha256").update(body.token).digest("hex");
  let updated: boolean;
  try {
    const passwordHash = hashCustomerPassword(body.password);
    updated = await resetCustomerPassword(tokenHash, passwordHash);
  } catch (error) {
    console.error("Could not reset the customer password.", error);
    return jsonResponse({ error: "Password reset is temporarily unavailable." }, 503);
  }
  if (!updated) {
    return jsonResponse({ error: "This password reset link is invalid or has expired." }, 400);
  }

  const response = jsonResponse({ ok: true, message: "Your password has been updated. Please sign in again." });
  response.cookies.set(getCustomerSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
