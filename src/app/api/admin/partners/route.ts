import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin-auth";
import { getAuthenticatedAdminSession } from "@/lib/admin-access";
import {
  createAdminPartnerShop,
  listAdminPartnerShops,
  updateAdminPartnerShop,
} from "@/lib/db/admin-management-repository";

type PartnerInput = {
  id?: string;
  slug: string;
  name: string;
  area: string;
  city: string;
  commissionRate: number;
  handoverDays: number;
  active?: boolean;
};

async function isSuperAdmin(request: NextRequest) {
  const session = await getAuthenticatedAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
  return session?.role === "super_admin";
}

function isUniqueViolation(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && error.code === "23505";
}

function parsePartnerInput(value: unknown, editing: boolean): PartnerInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const area = typeof body.area === "string" ? body.area.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const commissionRate = body.commissionRate;
  const handoverDays = body.handoverDays;
  const active = body.active;

  if ((editing && (!id || id.length > 128))
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80
      || name.length < 2 || name.length > 120
      || area.length > 120 || city.length < 2 || city.length > 100
      || typeof commissionRate !== "number" || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100
      || typeof handoverDays !== "number" || !Number.isInteger(handoverDays) || handoverDays < 0 || handoverDays > 365
      || (editing && typeof active !== "boolean")) return null;

  return {
    ...(editing ? { id } : {}),
    slug,
    name,
    area,
    city,
    commissionRate,
    handoverDays,
    ...(editing ? { active: active as boolean } : {}),
  };
}

export async function GET(request: NextRequest) {
  if (!await isSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const shops = await listAdminPartnerShops();
    return NextResponse.json({ shops }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load partner shops.", error);
    return NextResponse.json({ error: "Could not load partner shops." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!await isSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid partner shop details." }, { status: 400 });
  }
  const input = parsePartnerInput(value, false);
  if (!input) return NextResponse.json({ error: "Enter a valid shop name, slug, location, commission, and handover time." }, { status: 400 });

  try {
    const shop = await createAdminPartnerShop(input);
    return NextResponse.json({ shop }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: "That shop URL is already in use." }, { status: 409 });
    console.error("Could not create partner shop.", error);
    return NextResponse.json({ error: "Could not create partner shop." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!await isSuperAdmin(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid partner shop update." }, { status: 400 });
  }
  const input = parsePartnerInput(value, true);
  if (!input || !input.id || input.active === undefined) {
    return NextResponse.json({ error: "Enter valid partner shop details." }, { status: 400 });
  }

  try {
    const shop = await updateAdminPartnerShop({ ...input, id: input.id, active: input.active });
    if (!shop) return NextResponse.json({ error: "Partner shop was not found." }, { status: 404 });
    return NextResponse.json({ shop }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: "That shop URL is already in use." }, { status: 409 });
    console.error("Could not update partner shop.", error);
    return NextResponse.json({ error: "Could not update partner shop." }, { status: 503 });
  }
}
