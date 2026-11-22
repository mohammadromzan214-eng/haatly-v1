import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin-auth";
import { getAuthenticatedAdminSession } from "@/lib/admin-access";
import {
  getAdminCustomerDetails,
  listAdminCustomers,
  updateAdminCustomer,
} from "@/lib/db/admin-management-repository";

async function isSuperAdmin(request: NextRequest) {
  const session = await getAuthenticatedAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
  return session?.role === "super_admin";
}

function isUniqueViolation(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && error.code === "23505";
}

export async function GET(request: NextRequest) {
  if (!await isSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (search.length > 120) return NextResponse.json({ error: "Search text is too long." }, { status: 400 });

  try {
    if (id) {
      const details = await getAdminCustomerDetails(id);
      if (!details) return NextResponse.json({ error: "Customer was not found." }, { status: 404 });
      return NextResponse.json(details, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ customers: await listAdminCustomers(search) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load customer records.", error);
    return NextResponse.json({ error: "Could not load customers." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!await isSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid customer update." }, { status: 400 });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({ error: "Invalid customer update." }, { status: 400 });
  }

  const body = value as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const active = body.active;
  if (!id || id.length > 128 || name.length < 2 || name.length > 120
      || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || (phone !== "" && !/^(?:\+?880|0)1[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, "")))
      || typeof active !== "boolean") {
    return NextResponse.json({ error: "Enter a valid name, email, optional Bangladesh phone number, and account status." }, { status: 400 });
  }

  try {
    const customer = await updateAdminCustomer({ id, name, email, phone, active });
    if (!customer) return NextResponse.json({ error: "Customer was not found." }, { status: 404 });
    return NextResponse.json({ customer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: "That email address is already in use." }, { status: 409 });
    console.error("Could not update customer.", error);
    return NextResponse.json({ error: "Could not update customer." }, { status: 503 });
  }
}
