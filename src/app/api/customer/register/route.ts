import { NextRequest, NextResponse } from "next/server";
import {
  createCustomerSession,
  getCustomerSessionCookieName,
  getCustomerSessionTtlSeconds,
} from "@/lib/customer-auth";
import { registerCustomer, toSession } from "@/lib/db/customer-repository";

export async function POST(request: NextRequest) {
  let body: { name?: unknown; email?: unknown; phone?: unknown; password?: unknown };
  try {
    body = JSON.parse(await request.text()) as { name?: unknown; email?: unknown; phone?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!/^(?:\+?880|0)1[3-9]\d{8}$/.test(phone)) return NextResponse.json({ error: "Enter a valid Bangladesh mobile number." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  let customer;
  try {
    customer = await registerCustomer({ name, email, phone, password });
  } catch (error) {
    console.error("Could not register customer.", error);
    return NextResponse.json({ error: "Customer registration is temporarily unavailable." }, { status: 503 });
  }
  if (!customer) return NextResponse.json({ error: "An account already exists with this email." }, { status: 409 });

  const session = toSession(customer);
  const response = NextResponse.json({ customer: session });
  response.cookies.set(getCustomerSessionCookieName(), await createCustomerSession(session), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: getCustomerSessionTtlSeconds(),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
