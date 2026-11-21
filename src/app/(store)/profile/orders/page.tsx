"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PackageSearch } from "lucide-react";
import type { Order } from "@/lib/types";
import { ORDER_FLOW, ORDER_STATUS_LABEL } from "@/lib/types";
import { formatPrice } from "@/lib/site";

export default function ProfileOrdersPage() {
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customer/orders", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json() as { orders?: Order[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load orders.");
        setCustomerOrders(result.orders ?? []);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load orders."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Account</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">My orders</h1>
      <p className="mt-2 text-sm text-ink-soft">Your order history and delivery status.</p>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-clay">{error}</p>}
      <div className="mt-7 space-y-4">
        {customerOrders.map((order) => {
          const progress = (ORDER_FLOW.indexOf(order.status) + 1) / ORDER_FLOW.length;
          const total = order.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0) + order.deliveryFee - order.discount;
          return (
            <article key={order.code} className="rounded-[26px] border border-line bg-paper p-5 md:p-6">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
                <div><p className="font-mono text-xs text-muted">{order.code}</p><h2 className="mt-1 font-display text-xl font-bold">{new Date(order.placedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</h2></div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-forest/10 px-3.5 py-1.5 text-xs font-semibold text-forest">{ORDER_STATUS_LABEL[order.status]}</span>
                  {order.paymentStatus && <span className="rounded-full bg-paper-2 px-3.5 py-1.5 text-xs font-semibold capitalize text-ink-soft">Payment {order.paymentStatus}</span>}
                </div>
              </header>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <p><span className="text-muted">Delivering to</span> <strong>{order.shipTo.area}, {order.shipTo.city}</strong></p>
                <p><span className="text-muted">Total</span> <strong>{formatPrice(total)}</strong></p>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted"><span>Delivery progress</span><span>{Math.round(progress * 100)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-forest" style={{ width: `${progress * 100}%` }} /></div>
                <div className="mt-2 flex justify-between gap-1">
                  {ORDER_FLOW.map((status, index) => <span key={status} className={`text-[9px] sm:text-[10px] ${index <= ORDER_FLOW.indexOf(order.status) ? "font-semibold text-forest" : "text-muted"}`}>{ORDER_STATUS_LABEL[status]}</span>)}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-sm text-ink-soft">{order.lines.map((line) => `${line.title} × ${line.qty}`).join(" · ")}</p>
                <Link href={`/profile/order/${order.code}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-clay">Order details <ArrowRight className="size-4" /></Link>
              </div>
            </article>
          );
        })}
      </div>
      {!loading && customerOrders.length === 0 && !error && <div className="mt-8 rounded-[28px] border border-dashed border-line py-16 text-center"><PackageSearch className="mx-auto size-10 text-clay" /><p className="mt-4 font-display text-xl font-bold">No orders yet</p></div>}
    </div>
  );
}
