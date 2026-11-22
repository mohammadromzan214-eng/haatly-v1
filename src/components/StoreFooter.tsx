import Link from "next/link";
import type { Category } from "@/lib/types";
import type { AdminSettings } from "@/components/admin/AdminDataProvider";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

export function StoreFooter({ categories, settings }: { categories: Category[]; settings: AdminSettings }) {
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="stitch text-clay" />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="paper" name={settings.storeName} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/70">{site.description}</p>
          {settings.address && <p className="mt-6 font-mono text-xs text-paper/50">{settings.address}</p>}
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-marigold">Shop</h4>
          <ul className="mt-4 space-y-2 text-sm text-paper/75">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/products/category/${c.slug}`} className="hover:text-paper">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-marigold">Orders</h4>
          <ul className="mt-4 space-y-2 text-sm text-paper/75">
            <li><Link href="/track-order" className="hover:text-paper">Track an order</Link></li>
            <li><Link href="/cart" className="hover:text-paper">Your bag</Link></li>
            <li><Link href="/products?source=pre_order" className="hover:text-paper">Pre-orders</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-marigold">Help</h4>
          <ul className="mt-4 space-y-2 text-sm text-paper/75">
            {settings.phone && <li className="font-mono">{settings.phone}</li>}
            {settings.email && <li>{settings.email}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-paper/50">
          <p>© 2026 {settings.storeName}. Pay with bKash, Nagad, cards or cash on delivery.</p>
          <p className="font-mono">Made in Dhaka</p>
        </div>
      </div>
    </footer>
  );
}
