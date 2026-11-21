import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-auth";
import { getUserById, toSession } from "@/lib/db/customer-repository";

export async function GET(request: NextRequest) {
  const session = await verifyCustomerSession(request.cookies.get(getCustomerSessionCookieName())?.value);
  if (!session) return NextResponse.json({ customer: null }, { headers: { "Cache-Control": "no-store" } });
  try {
    const user = await getUserById(session.id);
    const customer = user?.role === "customer" ? toSession(user) : null;
    const response = NextResponse.json({ customer });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Could not restore customer session.", error);
    return NextResponse.json({ error: "Customer session is temporarily unavailable." }, { status: 503 });
  }
}
