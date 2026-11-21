import { createPublicKey, timingSafeEqual, verify as verifySignature } from "node:crypto";

interface GoogleJwk extends Record<string, unknown> {
  kty?: string;
  n?: string;
  e?: string;
  kid?: string;
  alg?: string;
  use?: string;
}

interface GoogleIdTokenClaims {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  exp?: number;
  iat?: number;
  nonce?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
}

let cachedKeys: { expiresAt: number; keys: GoogleJwk[] } | null = null;

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function getGoogleKeys() {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;

  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not retrieve Google signing keys.");
  const body = await response.json() as { keys?: GoogleJwk[] };
  if (!Array.isArray(body.keys)) throw new Error("Google signing keys response was invalid.");
  cachedKeys = { keys: body.keys, expiresAt: Date.now() + 60 * 60 * 1000 };
  return cachedKeys.keys;
}

export async function verifyGoogleIdToken(idToken: string, expectedNonce: string, clientId: string) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Google ID token was malformed.");

  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Google ID token used an unsupported signature.");

  const jwk = (await getGoogleKeys()).find((key) => key.kid === header.kid && key.alg === "RS256" && key.use === "sig");
  if (!jwk) throw new Error("Google signing key was not found.");
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const signedContent = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = Buffer.from(parts[2], "base64url");
  if (!verifySignature("RSA-SHA256", signedContent, publicKey, signature)) {
    throw new Error("Google ID token signature was invalid.");
  }

  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as GoogleIdTokenClaims;
  const audience = typeof claims.aud === "string" ? [claims.aud] : claims.aud;
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") {
    throw new Error("Google ID token issuer was invalid.");
  }
  if (!audience?.includes(clientId) || (claims.azp && claims.azp !== clientId)
      || (audience.length > 1 && claims.azp !== clientId)) {
    throw new Error("Google ID token audience was invalid.");
  }
  if (typeof claims.exp !== "number" || claims.exp <= now
      || typeof claims.iat !== "number" || claims.iat > now + 60) {
    throw new Error("Google ID token has expired or is not yet valid.");
  }
  if (typeof claims.nonce !== "string" || !constantTimeEqual(claims.nonce, expectedNonce)) {
    throw new Error("Google ID token nonce was invalid.");
  }
  if (typeof claims.sub !== "string" || !claims.sub
      || typeof claims.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)
      || (claims.email_verified !== true && claims.email_verified !== "true")) {
    throw new Error("Google account did not provide a verified email address.");
  }

  return {
    subject: claims.sub,
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" ? claims.name : "",
  };
}

export function safeCustomerDestination(value: string | null | undefined) {
  if (!value) return "/profile";
  if (value === "/checkout" || value === "/profile" || value.startsWith("/profile/")) return value;
  return "/profile";
}

export function getCustomerAppOrigin(requestOrigin: string) {
  const configuredOrigin = process.env.APP_BASE_URL ?? process.env.GOOGLE_REDIRECT_URI;
  if (configuredOrigin) return new URL(configuredOrigin).origin;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set APP_BASE_URL or GOOGLE_REDIRECT_URI before enabling Google sign-in in production.");
  }
  return requestOrigin;
}

export function getGoogleCallbackUri(requestOrigin: string) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  return `${getCustomerAppOrigin(requestOrigin)}/api/customer/oauth/google/callback`;
}
