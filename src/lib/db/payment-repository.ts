import type { PaymentStatus } from "@/lib/types";
import { getDb } from "./client";

export interface AdminPayment {
  id: string;
  orderCode: string;
  provider: string;
  paymentMethod: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  transactionReference: string | null;
  verificationStatus: string;
  verificationNote: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  customerName: string;
  phone: string;
}

export class PaymentTransitionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PaymentTransitionError";
  }
}

export async function listAdminPayments(status?: PaymentStatus) {
  const sql = getDb();
  const rows = status
    ? await sql`
        SELECT p.id,p.order_code,p.provider,p.status,p.amount,p.currency,p.transaction_reference,
          p.verification_status,p.verification_note,p.verified_by,p.verified_at,p.created_at,
          o.payment_method,o.customer_name,o.phone
        FROM payments p JOIN orders o ON o.code=p.order_code
        WHERE p.status=${status}
        ORDER BY p.created_at DESC
      `
    : await sql`
        SELECT p.id,p.order_code,p.provider,p.status,p.amount,p.currency,p.transaction_reference,
          p.verification_status,p.verification_note,p.verified_by,p.verified_at,p.created_at,
          o.payment_method,o.customer_name,o.phone
        FROM payments p JOIN orders o ON o.code=p.order_code
        ORDER BY p.created_at DESC
      `;
  return rows.map((row): AdminPayment => ({
    id: row.id,
    orderCode: row.order_code,
    provider: row.provider,
    paymentMethod: row.payment_method,
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    transactionReference: row.transaction_reference,
    verificationStatus: row.verification_status,
    verificationNote: row.verification_note,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    customerName: row.customer_name,
    phone: row.phone,
  }));
}

export async function recordPaymentInitiation(
  paymentId: string,
  transactionReference: string,
  providerData: { mode: "mock"; message: string },
) {
  const sql = getDb();
  await sql.begin(async (tx) => {
    const [payment] = await tx`
      UPDATE payments
      SET status='pending',transaction_reference=${transactionReference},
        verification_status='unverified',verification_note='',provider_data=${tx.json(providerData)},updated_at=now()
      WHERE id=${paymentId}
      RETURNING order_code
    `;
    if (!payment) throw new Error("Payment record was not found after order creation.");
    await tx`UPDATE orders SET payment_status='pending',payment_reference=${transactionReference} WHERE code=${payment.order_code}`;
  });
}

export async function recordPaymentInitiationFailure(paymentId: string) {
  const sql = getDb();
  await sql.begin(async (tx) => {
    const [payment] = await tx`
      UPDATE payments
      SET status='failed',verification_status='rejected',
        verification_note='The payment provider could not be initialized.',
        provider_data=${tx.json({ mode: "mock", message: "The payment could not be initiated. Contact Haatly support before trying again." })},
        updated_at=now()
      WHERE id=${paymentId}
      RETURNING order_code
    `;
    if (!payment) throw new Error("Payment record was not found after order creation.");
    await tx`UPDATE orders SET payment_status='failed' WHERE code=${payment.order_code}`;
  });
}

export async function updateAdminPayment(input: {
  paymentId: string;
  status: PaymentStatus;
  transactionReference: string | null;
  verificationNote: string;
}) {
  const sql = getDb();
  return sql.begin(async (tx) => {
    const [payment] = await tx`
      SELECT id,order_code,status FROM payments WHERE id=${input.paymentId} FOR UPDATE
    `;
    if (!payment) throw new PaymentTransitionError("Payment record not found.", 404);

    const currentStatus = payment.status as PaymentStatus;
    const validTransition = currentStatus === input.status
      || (currentStatus === "pending" && (input.status === "paid" || input.status === "failed"))
      || (currentStatus === "failed" && (input.status === "pending" || input.status === "paid"))
      || (currentStatus === "paid" && input.status === "refunded");
    if (!validTransition) {
      throw new PaymentTransitionError(`A ${currentStatus} payment cannot be changed to ${input.status}.`, 409);
    }

    const verificationStatus = input.status === "paid" || input.status === "refunded"
      ? "verified"
      : input.status === "failed" ? "rejected" : "unverified";
    const verifiedAt = verificationStatus === "unverified" ? null : new Date();
    const verifiedBy = verificationStatus === "unverified" ? null : "mock-admin";
    await tx`
      UPDATE payments
      SET status=${input.status},transaction_reference=${input.transactionReference},
        verification_status=${verificationStatus},verification_note=${input.verificationNote},
        verified_by=${verifiedBy},verified_at=${verifiedAt},updated_at=now()
      WHERE id=${input.paymentId}
    `;
    await tx`
      UPDATE orders
      SET payment_status=${input.status},payment_reference=${input.transactionReference}
      WHERE code=${payment.order_code}
        AND payment_status IN ('pending','paid','failed','refunded')
    `;
    return { ok: true as const };
  });
}
