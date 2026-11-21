import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-auth";
import { readAdminSnapshot, writeAdminMutation } from "@/lib/db/admin-repository";

async function authorized(request: NextRequest) {
  return verifyAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
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
    console.error("Could not write admin data.", error);
    return NextResponse.json({ error: "Could not save changes to the database." }, { status: 500 });
  }
}
