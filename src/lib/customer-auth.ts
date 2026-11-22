export interface CustomerSession {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface CustomerSessionClaims extends CustomerSession {
  sessionVersion: number;
  exp: number;
}

const SESSION_COOKIE = "haatly_customer_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export function getCustomerSessionCookieName() {
  return SESSION_COOKIE;
}

export function getCustomerSessionTtlSeconds() {
  return SESSION_TTL_SECONDS;
}

export function getCustomerAuthSecret() {
  const secret = process.env.CUSTOMER_AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("Set CUSTOMER_AUTH_SECRET to a random value of at least 32 characters in production.");
  }
  return secret ?? "haatly-temporary-customer-auth-secret-change-me";
}

function encodeText(value: string) {
  return new TextEncoder().encode(value);
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signPayload(payload: string) {
  const key = await crypto.subtle.importKey("raw", encodeText(getCustomerAuthSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encodeText(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createCustomerSession(customer: CustomerSession, sessionVersion = 0) {
  const payload = base64UrlEncode(encodeText(JSON.stringify({
    ...customer,
    sessionVersion,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  })));
  return `${payload}.${await signPayload(payload)}`;
}

export async function verifyCustomerSessionClaims(token: string | undefined): Promise<CustomerSessionClaims | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature || !constantTimeEqual(signature, await signPayload(payload))) return null;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as Partial<CustomerSessionClaims>;
    const sessionVersion = decoded.sessionVersion ?? 0;
    if (typeof decoded.id !== "string" || !decoded.id
        || typeof decoded.name !== "string" || !decoded.name
        || typeof decoded.email !== "string" || !decoded.email
        || typeof decoded.phone !== "string"
        || !Number.isInteger(sessionVersion) || sessionVersion < 0
        || typeof decoded.exp !== "number" || decoded.exp <= Date.now()) return null;
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      phone: decoded.phone,
      sessionVersion,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

export async function verifyCustomerSession(token: string | undefined): Promise<CustomerSession | null> {
  const claims = await verifyCustomerSessionClaims(token);
  if (!claims) return null;
  return { id: claims.id, name: claims.name, email: claims.email, phone: claims.phone };
}
