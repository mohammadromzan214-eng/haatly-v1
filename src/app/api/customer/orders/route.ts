import { NextRequest, NextResponse } from "next/server";
import { customerSessionUnavailableResponse, verifyActiveCustomerRequest } from "@/lib/customer-access";
import { listCustomerOrders } from "@/lib/db/order-repository";

export async function GET(request: NextRequest) {
  const check = await verifyActiveCustomerRequest(request);
  if (check.status === "unavailable") return customerSessionUnavailableResponse();
  const customer = check.status === "authenticated" ? check.customer : null;
  if (!customer) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ orders: await listCustomerOrders(customer.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load customer orders.", error);
    return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  }
}
