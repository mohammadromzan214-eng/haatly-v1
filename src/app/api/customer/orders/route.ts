import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-auth";
import { listCustomerOrders } from "@/lib/db/order-repository";

export async function GET(request: NextRequest) {
  const customer = await verifyCustomerSession(request.cookies.get(getCustomerSessionCookieName())?.value);
  if (!customer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ orders: await listCustomerOrders(customer.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load customer orders.", error);
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }
}
