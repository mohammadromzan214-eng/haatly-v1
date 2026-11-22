import { NextRequest, NextResponse } from "next/server";
import {
  createCustomerSession,
  getCustomerSessionCookieName,
  getCustomerSessionTtlSeconds,
} from "@/lib/customer-auth";
import { authenticateCustomer, toSession } from "@/lib/db/customer-repository";

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = JSON.parse(await request.text()) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  let customer;
  try {
    customer = await authenticateCustomer(email, password);
  } catch (error) {
    console.error("Could not authenticate customer.", error);
    return NextResponse.json({ error: "Customer sign-in is temporarily unavailable." }, { status: 503 });
  }
  if (!customer) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const session = toSession(customer);
  const response = NextResponse.json({ customer: session });
  response.cookies.set(getCustomerSessionCookieName(), await createCustomerSession(session, customer.sessionVersion), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: getCustomerSessionTtlSeconds(),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
