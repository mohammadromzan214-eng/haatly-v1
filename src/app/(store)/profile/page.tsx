"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Heart, MapPin, PackageCheck, UserRound } from "lucide-react";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";
import { useCart } from "@/components/Providers";
import { ORDER_STATUS_LABEL, orderProgressPercent, type Order } from "@/lib/types";

export default function ProfilePage() {
  const { customer, addresses } = useCustomerAuth();
  const { wishlist } = useCart();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!customer) return;
    fetch("/api/customer/orders", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json() as { orders?: Order[] };
        if (response.ok) setRecentOrders(result.orders ?? []);
      })
      .catch((error: unknown) => console.error("Could not load recent customer orders.", error));
  }, [customer]);
  if (!customer) return null;
  const defaultAddress = addresses.find((address) => address.default) ?? addresses[0];

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">My account</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Welcome, {customer.name}</h1>
          <p className="mt-2 text-sm text-ink-soft">Your Haatly account at a glance.</p>
        </div>
        <Link href="/profile/edit-profile" className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink">Edit profile</Link>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Orders", value: recentOrders.length, href: "/profile/orders", icon: PackageCheck, note: "Recent orders" },
          { title: "Wishlist", value: wishlist.length, href: "/profile/wishlist", icon: Heart, note: "Saved products" },
          { title: "Addresses", value: addresses.length, href: "/profile/addresses", icon: MapPin, note: defaultAddress ? `Default: ${defaultAddress.label}` : "Add a delivery address" },
          { title: "Profile", value: "Ready", href: "/profile/edit-profile", icon: UserRound, note: customer.email },
        ].map((card) => (
          <Link key={card.title} href={card.href} className="rounded-[24px] border border-line bg-paper p-5 transition hover:-translate-y-0.5 hover:border-ink">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-paper-2"><card.icon className="size-5 text-clay" /></span>
              <ArrowRight className="size-4 text-muted" />
            </div>
            <p className="mt-4 font-display text-2xl font-bold">{card.value}</p>
            <p className="font-semibold">{card.title}</p>
            <p className="mt-1 truncate text-xs text-muted">{card.note}</p>
          </Link>
        ))}
      </div>

      <section className="mt-9">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Latest activity</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Recent orders</h2>
          </div>
          <Link href="/profile/orders" className="text-sm font-semibold text-clay hover:underline">View all</Link>
        </div>
        <div className="mt-4 space-y-3">
          {recentOrders.slice(0, 2).map((order) => {
            const progress = orderProgressPercent(order);
            return (
              <Link key={order.code} href={`/profile/order/${order.code}`} className="block rounded-[24px] border border-line bg-paper p-5 transition hover:border-ink">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-mono text-xs text-muted">{order.code}</p><p className="mt-1 font-display text-lg font-bold">{order.lines.length} items · {order.shipTo.city}</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.status === "cancelled" ? "bg-clay/10 text-clay" : "bg-forest/10 text-forest"}`}>{ORDER_STATUS_LABEL[order.status]}</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-forest transition-all" style={{ width: `${progress * 100}%` }} /></div>
                <p className="mt-2 text-xs text-muted">Delivery progress · {Math.round(progress * 100)}%</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
