import "server-only";
import type { AdminLoginIdentity, AdminSession } from "./admin-types";

const SESSION_COOKIE = "haatly_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const SESSION_AUDIENCE = "haatly-admin";
const MAX_SESSION_TOKEN_LENGTH = 2048;
const MIN_ADMIN_PASSWORD_LENGTH = 12;
const MIN_ADMIN_SECRET_LENGTH = 32;

interface AdminAuthConfiguration {
  email: string;
  password: string;
  secret: string;
}

interface AdminSessionPayload {
  role: AdminSession["role"];
  sub: string;
  accountVersion?: number;
  aud: string;
  iat: number;
  exp: number;
}

export class AdminAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthConfigurationError";
  }
}

function getAdminAuthConfiguration(): AdminAuthConfiguration {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_AUTH_SECRET;

  if (!email || !password || !secret) {
    throw new AdminAuthConfigurationError(
      "Admin authentication is not configured. Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_AUTH_SECRET.",
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AdminAuthConfigurationError("ADMIN_EMAIL must be a valid email address.");
  }
  if (password.trim().length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new AdminAuthConfigurationError(
      `ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters long.`,
    );
  }
  if (secret.length < MIN_ADMIN_SECRET_LENGTH) {
    throw new AdminAuthConfigurationError(
      `ADMIN_AUTH_SECRET must be at least ${MIN_ADMIN_SECRET_LENGTH} characters long.`,
    );
  }

  return { email, password, secret };
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

function textEncode(value: string) {
  return new TextEncoder().encode(value);
}

function constantTimeEqual(a: string, b: string) {
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

function signPayload(payload: string, secret: string) {
  return crypto.subtle.importKey(
    "raw",
    textEncode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  ).then(async (key) => {
    const signature = await crypto.subtle.sign("HMAC", key, textEncode(payload));
    return base64UrlEncode(new Uint8Array(signature));
  });
}

export function getAdminSessionCookieName() {
  return SESSION_COOKIE;
}

export function getAdminSessionTtlSeconds() {
  return SESSION_TTL_SECONDS;
}

export function adminCredentialsMatch(email: string, password: string) {
  const credentials = getAdminAuthConfiguration();
  const emailMatches = constantTimeEqual(email.trim().toLowerCase(), credentials.email);
  const passwordMatches = constantTimeEqual(password, credentials.password);
  return emailMatches && passwordMatches;
}

export async function createAdminSession(identity: AdminLoginIdentity) {
  const configuration = getAdminAuthConfiguration();
  const issuedAt = Date.now();
  const payload = base64UrlEncode(textEncode(JSON.stringify({
    ...identity,
    aud: SESSION_AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS * 1000,
  } satisfies AdminSessionPayload)));
  return `${payload}.${await signPayload(payload, configuration.secret)}`;
}

export async function verifyAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token || token.length > MAX_SESSION_TOKEN_LENGTH) return null;

  let configuration: AdminAuthConfiguration;
  try {
    configuration = getAdminAuthConfiguration();
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) return null;
    throw error;
  }

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expectedSignature = await signPayload(payload, configuration.secret);
  if (!constantTimeEqual(signature, expectedSignature)) return null;

  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as Partial<AdminSessionPayload>;
    const now = Date.now();
    const validIdentity = decoded.role === "super_admin"
      ? decoded.sub === configuration.email && decoded.accountVersion === undefined
      : decoded.role === "order_admin"
        && typeof decoded.sub === "string"
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded.sub)
        && Number.isInteger(decoded.accountVersion)
        && (decoded.accountVersion ?? -1) >= 0;
    const validSession = validIdentity
      && decoded.aud === SESSION_AUDIENCE
      && typeof decoded.iat === "number"
      && Number.isFinite(decoded.iat)
      && decoded.iat <= now + 60_000
      && typeof decoded.exp === "number"
      && Number.isFinite(decoded.exp)
      && decoded.exp > now
      && decoded.exp - decoded.iat <= SESSION_TTL_SECONDS * 1000;
    if (!validSession || (decoded.role !== "super_admin" && decoded.role !== "order_admin")) return null;
    return {
      role: decoded.role,
      sub: decoded.sub as string,
      ...(decoded.role === "order_admin" ? { accountVersion: decoded.accountVersion as number } : {}),
      iat: decoded.iat as number,
      exp: decoded.exp as number,
    };
  } catch {
    return null;
  }
}
