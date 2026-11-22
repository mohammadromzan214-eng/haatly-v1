import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin-auth";
import { getAuthenticatedAdminSession } from "@/lib/admin-access";
import { listAdminOrders, OrderTransitionError, updateAdminOrderStatus } from "@/lib/db/admin-order-repository";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const orders = await listAdminOrders();
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load admin orders.", error);
    return NextResponse.json({ error: "Could not load orders." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthenticatedAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid order update." }, { status: 400 });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({ error: "Invalid order update." }, { status: 400 });
  }

  const body = value as Record<string, unknown>;
  if (typeof body.code !== "string" || body.code.length > 128 || !body.code.trim()
      || typeof body.status !== "string" || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
    return NextResponse.json({ error: "Enter a valid order and status." }, { status: 400 });
  }

  try {
    await updateAdminOrderStatus({
      code: body.code.trim(),
      status: body.status as OrderStatus,
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not update order status.", error);
    return NextResponse.json({ error: "Could not update order status." }, { status: 503 });
  }
}
