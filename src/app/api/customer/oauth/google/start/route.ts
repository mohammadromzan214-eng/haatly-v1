import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGoogleCallbackUri, safeCustomerDestination } from "@/lib/google-oauth";

const STATE_COOKIE = "haatly_google_state";
const VERIFIER_COOKIE = "haatly_google_verifier";
const NONCE_COOKIE = "haatly_google_nonce";
const NEXT_COOKIE = "haatly_google_next";

function loginError(request: NextRequest, destination: string) {
  const configuredOrigin = process.env.APP_BASE_URL ?? process.env.GOOGLE_REDIRECT_URI;
  const login = new URL("/login", configuredOrigin ? new URL(configuredOrigin).origin : request.nextUrl.origin);
  login.searchParams.set("google_error", "unavailable");
  if (destination !== "/profile") login.searchParams.set("next", destination);
  return NextResponse.redirect(login);
}

export async function GET(request: NextRequest) {
  const destination = safeCustomerDestination(request.nextUrl.searchParams.get("next"));
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginError(request, destination);
  let callbackUri: string;
  try {
    callbackUri = getGoogleCallbackUri(request.nextUrl.origin);
  } catch {
    return loginError(request, destination);
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("nonce", nonce);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorize);
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  response.cookies.set(STATE_COOKIE, state, options);
  response.cookies.set(VERIFIER_COOKIE, verifier, options);
  response.cookies.set(NONCE_COOKIE, nonce, options);
  response.cookies.set(NEXT_COOKIE, destination, options);
  return response;
}
