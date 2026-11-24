"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, Truck } from "lucide-react";
import type { AdminCoupon } from "@/components/admin/AdminDataProvider";
import { cdn } from "@/lib/image";
import { formatPrice, site } from "@/lib/site";
import { StockBadge } from "./StockBadge";
import { useCart, useToast, type CartItem } from "./Providers";

type Zone = "inside" | "outside";

export function CartView({ coupons }: { coupons: AdminCoupon[] }) {
  const { items, ready, subtotal, setQty, remove } = useCart();
  const notify = useToast();
  const [zone, setZone] = useState<Zone>("inside");
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<AdminCoupon | null>(null);
  const [codeError, setCodeError] = useState("");

  // Group lines by seller so the cart preview matches the seller sub-orders created at checkout.
  const parcels = useMemo(() => {
    const map = new Map<string, { sellerName: string; items: CartItem[] }>();
    for (const i of items) {
      const g = map.get(i.sellerId) ?? { sellerName: i.sellerName, items: [] };
      g.items.push(i);
      map.set(i.sellerId, g);
    }
    return [...map.entries()];
  }, [items]);

  const discount = applied ? Math.min(Math.round((subtotal * applied.percentOff) / 100), applied.maxDiscount) : 0;
  const freeDelivery = subtotal - discount >= site.delivery.freeOver;
  const deliveryFee = items.length === 0 || freeDelivery ? 0 : zone === "inside" ? site.delivery.insideDhaka : site.delivery.outsideDhaka;
  const total = subtotal - discount + deliveryFee;
  const toFree = Math.max(0, site.delivery.freeOver - (subtotal - discount));

  function applyCode(e: React.FormEvent) {
    e.preventDefault();
    const match = coupons.find((c) => c.code === code.trim().toUpperCase());
    if (!match) {
      setCodeError("That code isn’t valid. Check the spelling and try again.");
      setApplied(null);
      return;
    }
    setCodeError("");
    setApplied(match);
    notify(`${match.code} applied — ${match.label.toLowerCase()}`);
  }

  if (!ready) {
    return (
      <div className="grid gap-10 py-14 lg:grid-cols-[1.6fr_1fr]" aria-busy>
        <div className="space-y-4">
          <div className="h-14 w-60 animate-pulse rounded-2xl bg-paper-2" />
          {[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-paper-2" />)}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-paper-2" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-28 text-center">
        <div className="relative">
          <ShoppingBag className="size-20 text-clay" strokeWidth={1.2} />
          <span className="absolute -right-2 -top-1 size-5 rounded-full bg-marigold" />
        </div>
        <h1 className="mt-8 font-display text-5xl font-extrabold tracking-tight">Your bag is empty.</h1>
        <p className="mt-3 max-w-md text-ink-soft">The haat is open — start with our bestsellers or browse the partner stalls.</p>
        <Link href="/products" className="mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-ink px-8 font-semibold text-paper hover:bg-clay">
          Start shopping <ArrowRight className="size-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
      <div>
        <h1 className="font-display text-5xl font-extrabold tracking-[-0.03em] md:text-6xl">Your bag</h1>
        <p className="mt-2 text-ink-soft">
          {items.reduce((n, i) => n + i.qty, 0)} items · {parcels.length} {parcels.length === 1 ? "parcel" : "parcels"}, delivered together
        </p>

        {toFree > 0 ? (
          <div className="mt-8 rounded-2xl bg-paper-2 p-4">
            <p className="flex items-center gap-2 text-sm"><Truck className="size-4 text-clay" />Add <strong>{formatPrice(toFree)}</strong> more for free delivery</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full origin-left rounded-full bg-clay transition-transform duration-500" style={{ transform: `scaleX(${Math.min(1, (subtotal - discount) / site.delivery.freeOver)})` }} />
            </div>
          </div>
        ) : (
          <p className="mt-8 flex items-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-medium text-paper"><Truck className="size-4" />You’ve unlocked free delivery.</p>
        )}

        <div className="mt-8 space-y-8">
          {parcels.map(([sellerId, group], idx) => (
            <section key={sellerId} className="rounded-[28px] border border-line bg-paper">
              <header className="flex items-center justify-between border-b border-line px-5 py-3 text-sm">
                <p className="font-semibold">Parcel {idx + 1} <span className="font-normal text-muted">· from {group.sellerName}</span></p>
                <span className="font-mono text-xs text-muted">{group.items.length} {group.items.length === 1 ? "line" : "lines"}</span>
              </header>
              <ul className="divide-y divide-line">
                {group.items.map((i) => (
                  <li key={i.productId} className="animate-fade flex gap-4 p-5">
                    <Link href={`/products/${i.slug}`} className="shrink-0 overflow-hidden rounded-2xl bg-paper-2">
                      <img src={cdn(i.image, 200, 200)} alt="" className="size-24 object-cover md:size-28" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/products/${i.slug}`} className="font-display text-lg font-semibold leading-snug hover:text-clay">{i.title}</Link>
                          <div className="mt-1.5"><StockBadge badge={i.badge} eta={i.preorderEta} /></div>
                        </div>
                        <p className="shrink-0 font-display text-lg font-bold">{formatPrice(i.price * i.qty)}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center rounded-full border border-line">
                          <button onClick={() => setQty(i.productId, i.qty - 1)} className="grid size-9 place-items-center rounded-full hover:bg-paper-2" aria-label="Decrease"><Minus className="size-3.5" /></button>
                          <span className="w-7 text-center font-mono text-sm font-semibold">{i.qty}</span>
                          <button onClick={() => setQty(i.productId, i.qty + 1)} disabled={i.qty >= i.maxQty} className="grid size-9 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30" aria-label="Increase"><Plus className="size-3.5" /></button>
                        </div>
                        <button
                          onClick={() => { remove(i.productId); notify("Removed from bag"); }}
                          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-clay"
                        >
                          <Trash2 className="size-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <aside className="lg:sticky lg:top-40 lg:self-start">
        <div className="rounded-[28px] bg-ink p-7 text-paper">
          <h2 className="font-display text-2xl font-bold">Order summary</h2>

          <fieldset className="mt-6">
            <legend className="text-xs font-semibold uppercase tracking-widest text-paper/60">Delivering to</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-full bg-paper/10 p-1 text-sm">
              {(["inside", "outside"] as const).map((z) => (
                <button key={z} onClick={() => setZone(z)} className={`rounded-full py-2 font-medium transition ${zone === z ? "bg-paper text-ink" : "text-paper/80 hover:text-paper"}`}>
                  {z === "inside" ? "Inside Dhaka" : "Outside Dhaka"}
                </button>
              ))}
            </div>
          </fieldset>

          <form onSubmit={applyCode} className="mt-6">
            <label className="text-xs font-semibold uppercase tracking-widest text-paper/60" htmlFor="coupon">Promo code</label>
            <div className="mt-2 flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-full bg-paper/10 px-4">
                <Tag className="size-4 text-marigold" />
                <input
                  id="coupon"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setCodeError(""); }}
                  placeholder="Try TOQAEE10"
                  className="w-full bg-transparent py-2.5 font-mono text-sm uppercase outline-none placeholder:normal-case placeholder:text-paper/40"
                  aria-invalid={!!codeError}
                  aria-describedby={codeError ? "coupon-error" : undefined}
                />
              </div>
              <button className="rounded-full bg-marigold px-5 text-sm font-semibold text-ink hover:bg-marigold-soft">Apply</button>
            </div>
            {codeError && <p id="coupon-error" className="mt-2 text-xs text-clay-2">{codeError}</p>}
          </form>

          <dl className="mt-7 space-y-3 border-t border-paper/15 pt-6 text-sm">
            <div className="flex justify-between"><dt className="text-paper/70">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            {discount > 0 && (
              <div className="flex justify-between text-marigold">
                <dt>Discount <span className="font-mono">({applied?.code})</span></dt><dd>−{formatPrice(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between"><dt className="text-paper/70">Delivery</dt><dd>{deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-paper/15 pt-4">
              <dt className="font-semibold">Total</dt>
              <dd className="font-display text-3xl font-bold">{formatPrice(total)}</dd>
            </div>
          </dl>

          <Link
            href={applied ? `/checkout?coupon=${encodeURIComponent(applied.code)}` : "/checkout"}
            className="mt-7 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-marigold font-semibold text-ink transition hover:bg-marigold-soft"
          >
            <ShoppingBag className="size-4" /> Continue to checkout
          </Link>
          <p className="mt-3 text-center text-xs text-paper/50">Guest Cash on Delivery · bKash and Nagad for signed-in customers</p>
        </div>
      </aside>
    </div>
  );
}
