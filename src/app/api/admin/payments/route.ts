import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionCookieName } from "@/lib/admin-auth";
import { getAuthenticatedAdminSession } from "@/lib/admin-access";
import { listAdminPayments, PaymentTransitionError, updateAdminPayment } from "@/lib/db/payment-repository";
import type { PaymentStatus } from "@/lib/types";

const STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];

async function authorized(request: NextRequest) {
  return getAuthenticatedAdminSession(request.cookies.get(getAdminSessionCookieName())?.value);
}

export async function GET(request: NextRequest) {
  const session = await authorized(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const rawStatus = request.nextUrl.searchParams.get("status");
  if (rawStatus && !STATUSES.includes(rawStatus as PaymentStatus)) {
    return NextResponse.json({ error: "Invalid payment status filter." }, { status: 400 });
  }
  try {
    const payments = await listAdminPayments(rawStatus ? rawStatus as PaymentStatus : undefined);
    return NextResponse.json({ payments, role: session.role }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load admin payments.", error);
    return NextResponse.json({ error: "Could not load payment records." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await authorized(request);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return NextResponse.json({ error: "Invalid payment update." }, { status: 400 });
    }
    body = value as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid payment update." }, { status: 400 });
  }

  if (typeof body.paymentId !== "string" || !body.paymentId.trim() || body.paymentId.length > 128
      || typeof body.status !== "string" || !STATUSES.includes(body.status as PaymentStatus)
      || (body.transactionReference !== undefined && body.transactionReference !== null && typeof body.transactionReference !== "string")
      || (body.verificationNote !== undefined && typeof body.verificationNote !== "string")) {
    return NextResponse.json({ error: "Enter a valid payment status and verification details." }, { status: 400 });
  }
  if (session.role === "order_admin" && body.status !== "paid" && body.status !== "failed" && body.status !== "refunded") {
    return NextResponse.json({ error: "Order admins can only verify payments or record a refund." }, { status: 403 });
  }
  const transactionReference = typeof body.transactionReference === "string" ? body.transactionReference.trim() : null;
  const verificationNote = typeof body.verificationNote === "string" ? body.verificationNote.trim() : "";
  if ((transactionReference?.length ?? 0) > 200 || verificationNote.length > 2000) {
    return NextResponse.json({ error: "Verification details are too long." }, { status: 400 });
  }

  try {
    await updateAdminPayment({
      paymentId: body.paymentId.trim(),
      status: body.status as PaymentStatus,
      transactionReference,
      verificationNote,
      verifiedBy: session.sub,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PaymentTransitionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Could not update payment verification.", error);
    return NextResponse.json({ error: "Could not update payment verification." }, { status: 503 });
  }
}
