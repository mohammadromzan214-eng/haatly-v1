import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionCookieName, verifyCustomerSessionClaims } from "@/lib/customer-auth";
import { getCustomerSessionState } from "@/lib/db/customer-repository";

export type CustomerSessionCheck =
  | { status: "authenticated"; customer: { id: string; name: string; email: string; phone: string } }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

export async function verifyActiveCustomerSession(token: string | undefined) {
  const claims = await verifyCustomerSessionClaims(token);
  if (!claims) return null;

  const customer = await getCustomerSessionState(claims.id);
  if (!customer || !customer.active || customer.sessionVersion !== claims.sessionVersion) return null;

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  };
}

export async function verifyActiveCustomerRequest(request: NextRequest): Promise<CustomerSessionCheck> {
  try {
    const customer = await verifyActiveCustomerSession(
      request.cookies.get(getCustomerSessionCookieName())?.value,
    );
    return customer ? { status: "authenticated", customer } : { status: "unauthenticated" };
  } catch (error) {
    console.error("Could not verify the customer session.", error);
    return { status: "unavailable" };
  }
}

export function customerSessionUnavailableResponse() {
  return NextResponse.json({ error: "Customer sign-in is temporarily unavailable." }, { status: 503 });
}
