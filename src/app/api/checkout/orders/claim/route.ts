import { NextRequest, NextResponse } from "next/server";
import { customerSessionUnavailableResponse, verifyActiveCustomerRequest } from "@/lib/customer-access";
import { claimCheckoutReceipt } from "@/lib/db/checkout-repository";

export async function POST(request: NextRequest) {
  const check = await verifyActiveCustomerRequest(request);
  if (check.status === "unavailable") return customerSessionUnavailableResponse();
  const customer = check.status === "authenticated" ? check.customer : null;
  if (!customer) return NextResponse.json({ error: "Sign in to link this order to your account." }, { status: 401 });

  let token: unknown;
  try {
    const body: unknown = await request.json();
    token = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).receiptToken
      : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid order claim request." }, { status: 400 });
  }
  if (typeof token !== "string" || token.length < 32 || token.length > 128) {
    return NextResponse.json({ error: "Invalid order claim request." }, { status: 400 });
  }

  try {
    const claimed = await claimCheckoutReceipt(customer.id, token);
    if (!claimed) {
      return NextResponse.json({ error: "This order cannot be linked to the account. Sign in with the phone number used for delivery." }, { status: 409 });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not link checkout order.", error);
    return NextResponse.json({ error: "Could not link this order right now." }, { status: 503 });
  }
}
