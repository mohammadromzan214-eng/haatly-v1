import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin-auth";
import { getAuthenticatedAdminSession } from "@/lib/admin-access";
import { AdminSettingsValidationError, readAdminSnapshot, writeAdminMutation } from "@/lib/db/admin-repository";

async function authorized(request: NextRequest) {
  const session = await getAuthenticatedAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
  return session?.role === "super_admin";
}

export async function GET(request: NextRequest) {
  if (!await authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const snapshot = await readAdminSnapshot();
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read admin data.", error);
    return NextResponse.json({ error: "Database unavailable. Check DATABASE_URL and apply migrations/seeds." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!await authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: { entity?: string; operation?: "upsert" | "delete"; data?: Record<string, unknown> };
  try {
    body = JSON.parse(await request.text()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.entity || !body.operation || !body.data) {
    return NextResponse.json({ error: "Entity, operation, and data are required." }, { status: 400 });
  }
  try {
    await writeAdminMutation({ entity: body.entity, operation: body.operation, data: body.data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminSettingsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Could not write admin data.", error);
    return NextResponse.json({ error: "Could not save changes to the database." }, { status: 500 });
  }
}
