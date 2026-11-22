"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, CircleDollarSign, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/site";
import { paymentMethodLabel, type PaymentStatus } from "@/lib/types";
import type { AdminRole } from "@/lib/admin-types";

interface PaymentRow {
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

type PaymentFilter = "all" | PaymentStatus;

const FILTERS: PaymentFilter[] = ["all", "pending", "paid", "failed", "refunded"];
const STATUS_CLASSES: Record<PaymentStatus, string> = {
  pending: "bg-marigold/20 text-ink",
  paid: "bg-forest/10 text-forest",
  failed: "bg-clay/10 text-clay",
  refunded: "bg-paper-2 text-ink-soft",
};

function VerificationForm({
  payment,
  saving,
  role,
  onSave,
}: {
  payment: PaymentRow;
  saving: boolean;
  role: AdminRole;
  onSave: (status: PaymentStatus, transactionReference: string, verificationNote: string) => void;
}) {
  const [reference, setReference] = useState(payment.transactionReference ?? "");
  const [note, setNote] = useState(payment.verificationNote);
  const actions: PaymentStatus[] = role === "order_admin"
    ? payment.status === "pending" ? ["paid", "failed"] : payment.status === "failed" ? ["paid"] : payment.status === "paid" ? ["refunded"] : []
    : payment.status === "pending"
      ? ["paid", "failed"]
      : payment.status === "failed"
        ? ["pending", "paid"]
        : payment.status === "paid" ? ["refunded"] : [];

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Transaction reference
          <input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={200} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-mono text-sm font-normal normal-case tracking-normal text-ink" placeholder="Provider transaction ID" />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted">
          Verification note
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-ink" placeholder="Optional internal note" />
        </label>
      </div>
      {payment.verifiedAt && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <ShieldCheck className="size-4 text-forest" /> Verified by {payment.verifiedBy ?? "admin"} · {new Date(payment.verifiedAt).toLocaleString()}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((status) => (
          <button key={status} type="button" disabled={saving} onClick={() => onSave(status, reference, note)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition disabled:opacity-50 ${status === "paid" ? "bg-forest text-paper hover:bg-forest/90" : status === "failed" || status === "refunded" ? "bg-clay text-paper hover:bg-clay/90" : "border border-line hover:border-ink"}`}>
            {saving ? "Saving…" : status === "paid" ? "Mark paid" : status === "failed" ? "Mark failed" : status === "refunded" ? "Record refund" : "Reopen as pending"}
          </button>
        ))}
        {payment.status === "refunded" && <span className="rounded-full bg-paper-2 px-4 py-2 text-xs font-semibold text-muted">Refund recorded</span>}
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [role, setRole] = useState<AdminRole>("super_admin");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const query = filter === "all" ? "" : `?status=${filter}`;
    fetch(`/api/admin/payments${query}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json() as { payments?: PaymentRow[]; role?: AdminRole; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load payments.");
        if (active) {
          setPayments(result.payments ?? []);
          if (result.role) setRole(result.role);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load payments.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, reload]);

  async function saveVerification(payment: PaymentRow, status: PaymentStatus, transactionReference: string, verificationNote: string) {
    setSavingId(payment.id);
    setError("");
    try {
      const response = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          paymentId: payment.id,
          status,
          transactionReference: transactionReference.trim() || null,
          verificationNote,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update payment.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update payment.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Sales</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">Review payment status, transaction references and manual verification details. Recording a refund does not transfer money; mock bKash/Nagad records are never treated as paid automatically.</p>
        </div>
        <button type="button" onClick={() => setReload((value) => value + 1)} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-ink"><RefreshCw className="size-4" /> Refresh</button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-line pb-4">
        {FILTERS.map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${filter === status ? "bg-ink text-paper" : "bg-paper-2 text-ink-soft hover:text-ink"}`}>
            {status === "all" ? "All payments" : status}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-5 flex items-center gap-2 rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay"><AlertCircle className="size-4" />{error}</p>}
      {loading && <p className="mt-8 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" />Loading payment records…</p>}
      {!loading && !error && payments.length === 0 && <div className="mt-8 rounded-3xl border border-dashed border-line p-12 text-center"><CircleDollarSign className="mx-auto size-9 text-clay" /><p className="mt-3 font-semibold">No {filter === "all" ? "" : `${filter} `}payments found.</p></div>}

      <div className="mt-6 space-y-4">
        {payments.map((payment) => (
          <article key={payment.id} className="rounded-[24px] border border-line bg-paper p-5 md:p-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-muted">{payment.orderCode}</p>
                <h2 className="mt-1 font-display text-xl font-bold">{payment.customerName || "Guest customer"}</h2>
                <p className="mt-1 text-sm text-ink-soft">{payment.phone} · {paymentMethodLabel(payment.paymentMethod)} · {payment.provider}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${STATUS_CLASSES[payment.status]}`}>{payment.status}</span>
                <span className="font-display text-lg font-bold">{formatPrice(payment.amount)}</span>
              </div>
            </header>
            <div className="mt-4 grid gap-2 rounded-2xl bg-paper-2/70 p-4 text-sm sm:grid-cols-2">
              <p><span className="text-muted">Transaction:</span> <span className="font-mono">{payment.transactionReference || "Not recorded"}</span></p>
              <p><span className="text-muted">Verification:</span> <span className="capitalize">{payment.verificationStatus}</span></p>
              {payment.verificationNote && <p className="sm:col-span-2"><span className="text-muted">Note:</span> {payment.verificationNote}</p>}
              <p className="text-xs text-muted">Created {new Date(payment.createdAt).toLocaleString()}</p>
              {payment.status === "paid" && <p className="flex items-center gap-1 text-xs text-forest"><Check className="size-3" />Payment verified</p>}
            </div>
            <VerificationForm payment={payment} saving={savingId === payment.id} role={role} onSave={(status, reference, note) => void saveVerification(payment, status, reference, note)} />
          </article>
        ))}
      </div>
    </main>
  );
}
