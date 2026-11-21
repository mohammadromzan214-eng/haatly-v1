import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getPasswordResetEmailConfiguration,
  sendPasswordResetEmail,
} from "@/lib/email/password-reset";
import {
  createPasswordResetToken,
  revokePasswordResetToken,
} from "@/lib/db/password-reset-repository";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const MAX_TRACKED_CLIENTS = 10_000;
const MAX_REQUEST_BODY_LENGTH = 4096;
const requests = new Map<string, { count: number; resetAt: number }>();
const GENERIC_RESPONSE = {
  ok: true,
  message: "If an account exists for that email, reset instructions will be sent shortly.",
};

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
  const current = requests.get(key);
  if (current && current.resetAt > now && current.count >= MAX_REQUESTS_PER_WINDOW) return true;

  const state = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (!current && requests.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = requests.keys().next().value;
    if (oldestKey) requests.delete(oldestKey);
  }
  requests.set(key, { count: state.count + 1, resetAt: state.resetAt });
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

  const email = (value as { email?: unknown }).email;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return jsonResponse({ error: "Enter a valid email address." }, 400);
  }

  const now = Date.now();
  if (isRateLimited(getClientKey(request), now)) {
    return jsonResponse({ error: "Too many requests. Try again later." }, 429);
  }

  let emailConfiguration;
  try {
    emailConfiguration = getPasswordResetEmailConfiguration();
  } catch (error) {
    console.error("Password reset email is not configured.", error);
    return jsonResponse({ error: "Password reset is temporarily unavailable." }, 503);
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  let user: { email: string } | null;
  try {
    user = await createPasswordResetToken({
      email,
      tokenHash,
      expiresAt: new Date(now + TOKEN_TTL_MS),
    });
  } catch (error) {
    console.error("Could not create a password reset token.", error);
    return jsonResponse({ error: "Password reset is temporarily unavailable." }, 503);
  }
  if (!user) return jsonResponse(GENERIC_RESPONSE);

  try {
    await sendPasswordResetEmail(emailConfiguration, user.email, token);
  } catch (error) {
    console.error("Could not deliver a password reset email.", error);
    try {
      await revokePasswordResetToken(tokenHash);
    } catch (revokeError) {
      console.error("Could not revoke an undelivered password reset token.", revokeError);
    }
  }

  return jsonResponse(GENERIC_RESPONSE);
}
