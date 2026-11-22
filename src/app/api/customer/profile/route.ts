import { NextRequest, NextResponse } from "next/server";
import { customerSessionUnavailableResponse, verifyActiveCustomerRequest } from "@/lib/customer-access";
import { toSession, updateCustomerProfile } from "@/lib/db/customer-repository";

export async function PATCH(request: NextRequest) {
  const check = await verifyActiveCustomerRequest(request);
  if (check.status === "unavailable") return customerSessionUnavailableResponse();
  const session = check.status === "authenticated" ? check.customer : null;
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { name?: unknown; email?: unknown; phone?: unknown };
  try {
    body = JSON.parse(await request.text()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^(?:\+?880|0)1[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, ""))) {
    return NextResponse.json({ error: "Enter a valid name, email, and Bangladesh mobile number." }, { status: 400 });
  }

  try {
    const user = await updateCustomerProfile(session.id, { name, email, phone });
    if (!user) return NextResponse.json({ error: "Customer account was not found." }, { status: 404 });
    return NextResponse.json({ customer: toSession(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json({ error: "That email address is already in use." }, { status: 409 });
    }
    console.error("Could not update customer profile.", error);
    return NextResponse.json({ error: "Could not save your profile." }, { status: 500 });
  }
}
