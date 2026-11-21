import { NextRequest, NextResponse } from "next/server";
import {
  getCustomerSessionCookieName,
  getCustomerSessionTtlSeconds,
  createCustomerSession,
} from "@/lib/customer-auth";
import { registerOrLoginGoogleCustomer, toSession } from "@/lib/db/customer-repository";
import { getCustomerAppOrigin, getGoogleCallbackUri, safeCustomerDestination, verifyGoogleIdToken } from "@/lib/google-oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "haatly_google_state";
const VERIFIER_COOKIE = "haatly_google_verifier";
const NONCE_COOKIE = "haatly_google_nonce";
const NEXT_COOKIE = "haatly_google_next";
const OAUTH_COOKIES = [STATE_COOKIE, VERIFIER_COOKIE, NONCE_COOKIE, NEXT_COOKIE];

function clearOAuthCookies(response: NextResponse, request: NextRequest) {
  for (const name of OAUTH_COOKIES) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

function fail(request: NextRequest, code: string, destination: string) {
  const configuredOrigin = process.env.APP_BASE_URL ?? process.env.GOOGLE_REDIRECT_URI;
  const login = new URL("/login", configuredOrigin ? new URL(configuredOrigin).origin : request.nextUrl.origin);
  login.searchParams.set("google_error", code);
  if (destination !== "/profile") login.searchParams.set("next", destination);
  const response = NextResponse.redirect(login);
  clearOAuthCookies(response, request);
  return response;
}

export async function GET(request: NextRequest) {
  const destination = safeCustomerDestination(request.cookies.get(NEXT_COOKIE)?.value);
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const code = request.nextUrl.searchParams.get("code");
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  const nonce = request.cookies.get(NONCE_COOKIE)?.value;
  const providerError = request.nextUrl.searchParams.get("error");

  if (!state || !expectedState || state !== expectedState) return fail(request, "state", destination);
  if (providerError || !code || !verifier || !nonce) return fail(request, "failed", destination);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(request, "unavailable", destination);

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getGoogleCallbackUri(request.nextUrl.origin),
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    const tokenPayload = await tokenResponse.json() as { id_token?: string };
    if (!tokenResponse.ok || typeof tokenPayload.id_token !== "string") {
      return fail(request, "failed", destination);
    }

    const profile = await verifyGoogleIdToken(tokenPayload.id_token, nonce, clientId);
    const user = await registerOrLoginGoogleCustomer(profile);
    const sessionToken = await createCustomerSession(toSession(user));
    const response = NextResponse.redirect(new URL(destination, getCustomerAppOrigin(request.nextUrl.origin)));
    response.cookies.set(getCustomerSessionCookieName(), sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: getCustomerSessionTtlSeconds(),
    });
    clearOAuthCookies(response, request);
    return response;
  } catch (error) {
    console.error("Google customer sign-in failed.", error);
    return fail(request, "failed", destination);
  }
}
