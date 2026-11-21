"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, PackageSearch, Search, ShoppingBag, UserRound, X } from "lucide-react";
import type { Category } from "@/lib/types";
import type { AdminSettings } from "@/components/admin/AdminDataProvider";
import { formatPrice, site } from "@/lib/site";
import { Logo } from "./Logo";
import { useCart } from "./Providers";
import { useCustomerAuth } from "./CustomerAuthProvider";

const NAV = [
  { href: "/products", label: "Shop all" },
  { href: "/products?source=pre_order", label: "Pre-orders" },
  { href: "/track-order", label: "Track order" },
];

export function StoreHeader({ categories, settings }: { categories: Category[]; settings: AdminSettings }) {
  const { count, ready } = useCart();
  const { customer } = useCustomerAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => setOpen(false), [pathname]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : "/products");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-md">
      <div className="bg-forest text-paper">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 text-xs">
          <p className="truncate">
            Free delivery on orders over <strong className="text-marigold">{formatPrice(site.delivery.freeOver)}</strong> · Cash on Delivery in all 64 districts
          </p>
          {settings.phone && <p className="hidden shrink-0 font-mono sm:block">Helpline {settings.phone}</p>}
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3 lg:gap-8">
        <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
        <Logo name={settings.storeName} />

        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="relative py-1 text-ink-soft transition hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submit} className="ml-auto hidden max-w-sm flex-1 md:block" role="search">
          <label className="flex items-center gap-2 rounded-full border border-line bg-paper-2/60 px-4 py-2.5 transition focus-within:border-ink focus-within:bg-paper">
            <Search className="size-4 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search jamdani, earbuds, tea…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="Search products"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/track-order" className="hidden size-11 place-items-center rounded-full hover:bg-paper-2 sm:grid lg:hidden" aria-label="Track order">
            <PackageSearch className="size-5" />
          </Link>
          <Link
            href={customer ? "/profile" : "/login"}
            className="grid size-11 place-items-center rounded-full hover:bg-paper-2"
            aria-label={customer ? "Customer account" : "Customer sign in"}
          >
            <UserRound className="size-5" />
          </Link>
          <Link href="/cart" className="relative grid size-11 place-items-center rounded-full bg-ink text-paper transition hover:bg-clay" aria-label={`Bag, ${count} items`}>
            <ShoppingBag className="size-5" />
            {ready && count > 0 && (
              <span key={count} className="animate-rise absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-marigold px-1 font-mono text-[11px] font-bold text-ink">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="no-scrollbar mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-5 pb-3 text-sm lg:flex">
        {categories.map((c) => {
          const active = pathname === `/products/category/${c.slug}`;
          return (
            <Link
              key={c.slug}
              href={`/products/category/${c.slug}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 transition ${active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-2"}`}
            >
              {c.name}
            </Link>
          );
        })}
      </div>

      {open && (
        <div className="animate-fade border-t border-line bg-paper px-5 pb-6 pt-4 lg:hidden">
          <form onSubmit={submit} className="mb-4" role="search">
            <label className="flex items-center gap-2 rounded-full border border-line bg-paper-2/60 px-4 py-3">
              <Search className="size-4 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Haatly" className="w-full bg-transparent text-sm outline-none" />
            </label>
          </form>
          <nav className="grid gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-xl px-3 py-2.5 font-display text-lg font-semibold hover:bg-paper-2">
                {n.label}
              </Link>
            ))}
            <Link href={customer ? "/profile" : "/login"} className="rounded-xl px-3 py-2.5 font-display text-lg font-semibold hover:bg-paper-2">
              {customer ? "My account" : "Sign in"}
            </Link>
          </nav>
          <div className="stitch my-4 text-line" />
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link key={c.slug} href={`/products/category/${c.slug}`} className="rounded-full border border-line px-3 py-1.5 text-sm">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
