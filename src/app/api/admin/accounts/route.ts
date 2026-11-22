import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin-auth";
import { getAuthenticatedAdminSession } from "@/lib/admin-access";
import {
  AdminAccountConflictError,
  AdminAccountNotFoundError,
  createOrderAdminAccount,
  listOrderAdminAccounts,
  resetOrderAdminPassword,
  setOrderAdminAccountActive,
} from "@/lib/db/admin-account-repository";

const MIN_PASSWORD_LENGTH = 12;

async function superAdmin(request: NextRequest) {
  const session = await getAuthenticatedAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
  return session?.role === "super_admin" ? session : null;
}

function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: NextRequest) {
  if (!await superAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const accounts = await listOrderAdminAccounts();
    return NextResponse.json({ accounts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load order admin accounts.", error);
    return NextResponse.json({ error: "Could not load admin accounts." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!await superAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid account details." }, { status: 400 });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({ error: "Invalid account details." }, { status: 400 });
  }

  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2 || name.length > 120 || !isValidEmail(email)
      || password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
    return NextResponse.json({
      error: `Enter a name, valid email, and password between ${MIN_PASSWORD_LENGTH} and 128 characters.`,
    }, { status: 400 });
  }
  if (email === process.env.ADMIN_EMAIL?.trim().toLowerCase()) {
    return NextResponse.json({ error: "The super-admin email is reserved." }, { status: 409 });
  }

  try {
    const id = await createOrderAdminAccount({ name, email, password });
    return NextResponse.json({ id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminAccountConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Could not create order admin account.", error);
    return NextResponse.json({ error: "Could not create admin account." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!await superAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid account update." }, { status: 400 });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({ error: "Invalid account update." }, { status: 400 });
  }

  const body = value as Record<string, unknown>;
  if (typeof body.id !== "string" || !/^adm_[a-f0-9]{24}$/.test(body.id)) {
    return NextResponse.json({ error: "Choose a valid admin account." }, { status: 400 });
  }
  const hasActive = typeof body.active === "boolean";
  const hasPassword = typeof body.password === "string";
  if (hasActive === hasPassword || (hasPassword && ((body.password as string).length < MIN_PASSWORD_LENGTH || (body.password as string).length > 128))) {
    return NextResponse.json({ error: "Set either an active state or a valid replacement password." }, { status: 400 });
  }

  try {
    if (hasActive) await setOrderAdminAccountActive(body.id, body.active as boolean);
    else await resetOrderAdminPassword(body.id, body.password as string);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminAccountNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Could not update order admin account.", error);
    return NextResponse.json({ error: "Could not update admin account." }, { status: 503 });
  }
}
