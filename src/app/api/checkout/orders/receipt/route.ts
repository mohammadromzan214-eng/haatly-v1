import { NextRequest, NextResponse } from "next/server";
import { getCheckoutReceipt } from "@/lib/db/checkout-repository";

export async function POST(request: NextRequest) {
  let token: unknown;
  try {
    const body: unknown = await request.json();
    token = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).receiptToken
      : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid receipt request." }, { status: 400 });
  }
  if (typeof token !== "string" || token.length < 32 || token.length > 128) {
    return NextResponse.json({ error: "Invalid receipt request." }, { status: 400 });
  }

  try {
    const receipt = await getCheckoutReceipt(token);
    if (!receipt) return NextResponse.json({ error: "This order receipt is unavailable or has expired." }, { status: 404 });
    return NextResponse.json({ receipt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load checkout receipt.", error);
    return NextResponse.json({ error: "Order receipt is temporarily unavailable." }, { status: 503 });
  }
}
