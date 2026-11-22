"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { formatPrice } from "@/lib/site";
import { ORDER_FLOW, ORDER_STATUSES, ORDER_STATUS_LABEL, paymentMethodLabel, type OrderStatus, type PaymentStatus } from "@/lib/types";

interface AdminOrder {
  code: string;
  status: OrderStatus;
  placedAt: string;
  customerName: string;
  customerEmail: string | null;
  phone: string;
  deliveryAddress: { district: string; area: string; address: string };
  notes: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
}

const FILTERS = ["all", ...ORDER_STATUSES] as const;
type OrderFilter = (typeof FILTERS)[number];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch("/api/admin/orders", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json() as { orders?: AdminOrder[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load orders.");
        if (active) setOrders(result.orders ?? []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load orders.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const visibleOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = filter === "all" || order.status === filter;
      const matchesQuery = !normalizedQuery
        || order.code.toLowerCase().includes(normalizedQuery)
        || order.phone.toLowerCase().includes(normalizedQuery)
        || order.customerName.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [filter, orders, query]);

  async function updateOrder(order: AdminOrder, status: OrderStatus) {
    if (status === "cancelled" && !window.confirm("Cancel this order? Its reserved product quantities will be returned to stock.")) return;
    setSavingCode(order.code);
    setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: order.code, status }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update order.");
      setReload((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update order.");
    } finally {
      setSavingCode("");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Sales</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Orders</h1>
          <p className="mt-2 text-sm text-ink-soft">Update delivery progress, verify payments, and cancel before delivery. Cancellation restores reserved stock; refunds are recorded separately. Showing the latest 200.</p>
        </div>
        <button type="button" onClick={() => setReload((current) => current + 1)} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-ink">
          <RefreshCw className="size-4" /> Refresh
        </button>
      </header>

      <div className="mt-7 flex flex-wrap gap-2">
        {FILTERS.map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === status ? "bg-ink text-paper" : "bg-paper-2 text-ink-soft hover:text-ink"}`}>
            {status === "all" ? "All orders" : ORDER_STATUS_LABEL[status]}
          </button>
        ))}
        <label className="ml-auto flex min-w-56 flex-1 items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 sm:max-w-sm">
          <Search className="size-4 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order, phone, or customer" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
      </div>

      {error && <p role="alert" className="mt-5 rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>}
      {loading && <p className="mt-8 flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" />Loading orders…</p>}
      {!loading && !error && visibleOrders.length === 0 && <p className="mt-8 rounded-3xl border border-dashed border-line p-12 text-center text-sm text-muted">No orders found.</p>}

      <div className="mt-6 space-y-4">
        {visibleOrders.map((order) => {
          const currentIndex = order.status === "cancelled" ? -1 : ORDER_FLOW.indexOf(order.status);
          const nextStatus = ORDER_FLOW[currentIndex + 1];
          const canAdvance = order.status !== "cancelled" && Boolean(nextStatus);
          const canCancel = order.status !== "delivered" && order.status !== "cancelled";
          return (
            <article key={order.code} className="rounded-[24px] border border-line bg-paper p-5 md:p-6">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted">{order.code}</p>
                  <h2 className="mt-1 font-display text-xl font-bold">{order.customerName || "Guest customer"}</h2>
                  <p className="mt-1 text-sm text-ink-soft">{order.phone}{order.customerEmail ? ` · ${order.customerEmail}` : ""}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(order.placedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-paper-2 px-3 py-1.5 text-xs font-semibold">{ORDER_STATUS_LABEL[order.status]}</span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${order.paymentStatus === "paid" ? "bg-forest/10 text-forest" : "bg-marigold/20 text-ink"}`}>{paymentMethodLabel(order.paymentMethod)} · {order.paymentStatus}</span>
                  <span className="font-display text-lg font-bold">{formatPrice(order.total)}</span>
                </div>
              </header>
              <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Delivery</h3>
                  <p className="mt-1 text-sm">{order.deliveryAddress.address || "Address not available"}</p>
                  <p className="text-sm text-ink-soft">{[order.deliveryAddress.area, order.deliveryAddress.district].filter(Boolean).join(", ")}</p>
                  {order.notes && <p className="mt-2 text-sm"><span className="font-semibold">Note:</span> {order.notes}</p>}
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Items</h3>
                  <ul className="mt-1 space-y-1 text-sm">
                    {order.items.map((item, index) => <li key={`${order.code}-${index}`}>{item.title} × {item.quantity} <span className="text-muted">({formatPrice(item.unitPrice * item.quantity)})</span></li>)}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Subtotal {formatPrice(order.subtotal)} · Delivery {formatPrice(order.deliveryFee)}{order.discount ? ` · Discount ${formatPrice(order.discount)}` : ""}</p>
                </div>
              </div>
              {(canAdvance || canCancel) && (
                <div className="mt-4 border-t border-line pt-4">
                  {canAdvance && nextStatus && (
                    <button type="button" disabled={savingCode === order.code} onClick={() => void updateOrder(order, nextStatus)} className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">
                      <Check className="size-4" /> {savingCode === order.code ? "Saving…" : `Move to ${ORDER_STATUS_LABEL[nextStatus]}`}
                    </button>
                  )}
                  {canCancel && (
                    <button type="button" disabled={savingCode === order.code} onClick={() => void updateOrder(order, "cancelled")} className="ml-2 inline-flex items-center gap-2 rounded-full border border-clay px-4 py-2.5 text-sm font-semibold text-clay disabled:opacity-50">
                      <X className="size-4" /> {savingCode === order.code ? "Saving…" : "Cancel order"}
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
