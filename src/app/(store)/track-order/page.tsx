import type { Metadata } from "next";
import { Check, CircleAlert, CreditCard, MapPin, PackageSearch, Truck, X } from "lucide-react";
import { getSellersByIds } from "@/lib/catalog";
import { findPublicOrder } from "@/lib/db/order-repository";
import { cdn } from "@/lib/image";
import { formatPrice } from "@/lib/site";
import { ORDER_FLOW, ORDER_STATUS_LABEL, orderProgressIndex, paymentMethodLabel, type Order, type Seller } from "@/lib/types";

export const metadata: Metadata = { title: "Track your order" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ code?: string; phone?: string }>;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" });

export default async function TrackOrderPage({ searchParams }: { searchParams: SearchParams }) {
  const { code = "", phone = "" } = await searchParams;
  const searched = code.trim() !== "" && phone.trim() !== "";
  const order = searched ? await findPublicOrder(code, phone) : undefined;
  const sellers = order ? await getSellersByIds([...new Set(order.lines.map((line) => line.sellerId))]) : [];
  const sellerNames = new Map(sellers.map((seller) => [seller.id, seller.name]));

  return (
    <main className="mx-auto max-w-7xl px-5 pb-10">
      <section className="grid gap-10 border-b border-line py-12 lg:grid-cols-[1fr_1.1fr] lg:items-end">
        <div className="animate-rise">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Order tracking</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.92] tracking-[-0.03em] md:text-7xl">Where’s my parcel?</h1>
          <p className="mt-5 max-w-md text-lg text-ink-soft">Enter the order number from your SMS or email, plus the phone number you ordered with.</p>
        </div>
        <form method="get" className="animate-rise rounded-[28px] bg-ink p-6 text-paper [animation-delay:120ms] md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-paper/60">Order number</span>
              <input name="code" defaultValue={code} required placeholder="TOQ-24117" className="mt-2 w-full rounded-2xl bg-paper/10 px-4 py-3.5 font-mono uppercase outline-none ring-marigold placeholder:text-paper/35 focus:ring-2" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-paper/60">Phone number</span>
              <input name="phone" defaultValue={phone} required inputMode="tel" placeholder="01XXX-XXXXXX" className="mt-2 w-full rounded-2xl bg-paper/10 px-4 py-3.5 font-mono outline-none ring-marigold placeholder:text-paper/35 focus:ring-2" />
            </label>
          </div>
          <button className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-marigold py-3.5 font-semibold text-ink transition hover:bg-marigold-soft">
            <PackageSearch className="size-5" /> Track order
          </button>
        </form>
      </section>

      {searched && !order && (
        <div role="alert" className="animate-rise mt-10 flex items-start gap-4 rounded-3xl border border-clay/40 bg-clay/5 p-6">
          <CircleAlert className="mt-0.5 size-6 shrink-0 text-clay" />
          <div>
            <p className="font-semibold">We couldn’t find an order matching those details.</p>
            <p className="mt-1 text-sm text-ink-soft">Double-check the order number (it starts with TOQ-) and use the phone number from checkout.</p>
          </div>
        </div>
      )}

      {order && <OrderResult order={order} sellerNames={sellerNames} />}
    </main>
  );
}

function OrderResult({ order, sellerNames }: { order: Order; sellerNames: Map<string, string> }) {
  const current = orderProgressIndex(order);
  const subtotal = order.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0);
  const total = subtotal + order.deliveryFee - order.discount;
  const progress = Math.max(0, current / (ORDER_FLOW.length - 1));
  const cancelledEvent = order.timeline.find((event) => event.status === "cancelled");

  return (
    <section className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="animate-rise">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-muted">{order.code}</p>
            <h2 className="mt-1 font-display text-4xl font-bold tracking-tight">{ORDER_STATUS_LABEL[order.status]}</h2>
          </div>
          <p className="flex items-center gap-2 rounded-full bg-paper-2 px-4 py-2 text-sm"><Truck className="size-4 text-clay" />{order.courier}</p>
        </div>

        {order.status === "cancelled" && (
          <p role="status" className="mt-5 rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay">
            This order was cancelled. Cancellation does not automatically refund a payment; contact TOQAEE support about any pending or paid payment.
          </p>
        )}

        {/* Horizontal progress (desktop) */}
        <div className="relative mt-10 hidden md:block">
          <div className="absolute left-4 right-4 top-4 h-1 rounded-full bg-line" />
          <div className="absolute left-4 top-4 h-1 origin-left rounded-full bg-forest" style={{ width: `calc((100% - 2rem) * ${progress})` }} />
          <ol className="relative grid grid-cols-7">
            {ORDER_FLOW.map((s, i) => {
              const done = i <= current;
              return (
                <li key={s} className="flex flex-col items-center text-center">
                  <span className={`grid size-9 place-items-center rounded-full border-2 transition ${i === current ? "border-forest bg-forest text-paper ring-4 ring-forest/20" : done ? "border-forest bg-forest text-paper" : "border-line bg-paper text-muted"}`}>
                    {done ? <Check className="size-4" strokeWidth={3} /> : <span className="font-mono text-xs">{i + 1}</span>}
                  </span>
                  <span className={`mt-3 text-xs font-medium ${done ? "text-ink" : "text-muted"}`}>{ORDER_STATUS_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Detailed timeline */}
        <ol className="mt-12 space-y-0 border-l-2 border-line pl-8">
          {ORDER_FLOW.map((s, i) => {
            const event = order.timeline.find((e) => e.status === s);
            const done = !!event;
            return (
              <li key={s} className="relative pb-8 last:pb-0">
                <span className={`absolute -left-[41px] top-0.5 grid size-5 place-items-center rounded-full ${done ? "bg-forest" : "border-2 border-line bg-paper"}`}>
                  {done && <Check className="size-3 text-paper" strokeWidth={3} />}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className={`font-semibold ${done ? "" : "text-muted"}`}>{ORDER_STATUS_LABEL[s]}</p>
                  {event && <p className="font-mono text-xs text-muted">{when(event.at)}</p>}
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">{event ? event.note : order.status !== "cancelled" && i === current + 1 ? "Up next" : "—"}</p>
              </li>
            );
          })}
          {order.status === "cancelled" && (
            <li className="relative pb-8 last:pb-0">
              <span className="absolute -left-[41px] top-0.5 grid size-5 place-items-center rounded-full bg-clay">
                <X className="size-3 text-paper" strokeWidth={3} />
              </span>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-clay">{ORDER_STATUS_LABEL.cancelled}</p>
                {cancelledEvent && <p className="font-mono text-xs text-muted">{when(cancelledEvent.at)}</p>}
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">{cancelledEvent?.note ?? "This order was cancelled."}</p>
            </li>
          )}
        </ol>
      </div>

      <aside className="animate-rise space-y-5 [animation-delay:120ms] lg:sticky lg:top-40 lg:self-start">
        <div className="rounded-[28px] border border-line bg-paper p-6">
          <h3 className="font-display text-xl font-bold">Items</h3>
          <ul className="mt-4 space-y-4">
            {order.lines.map((l) => (
              <li key={l.productId} className="flex gap-3">
                <img src={cdn(l.image, 120, 120)} alt="" className="size-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.title}</p>
                  <p className="text-xs text-muted">{sellerNames.get(l.sellerId) ?? "TOQAEE Retail"} · Qty {l.qty}</p>
                </div>
                <p className="text-sm font-semibold">{formatPrice(l.qty * l.unitPrice)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-clay"><dt>Discount</dt><dd>−{formatPrice(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : "Free"}</dd></div>
            <div className="flex justify-between pt-2 font-display text-lg font-bold"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
          </dl>
        </div>
        <div className="grid gap-3 rounded-[28px] bg-paper-2 p-6 text-sm">
          <p className="flex items-start gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-clay" /><span><strong>{order.shipTo.name}</strong><br />{order.shipTo.area}, {order.shipTo.city}</span></p>
          <p className="flex items-center gap-3"><CreditCard className="size-4 text-clay" />{paymentMethodLabel(order.paymentMethod)}{order.paymentStatus && <span className="ml-auto rounded-full bg-paper px-2.5 py-1 text-xs capitalize">{order.paymentStatus}</span>}</p>
        </div>
      </aside>
    </section>
  );
}
