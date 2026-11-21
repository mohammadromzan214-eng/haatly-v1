"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Heart, LogOut, MapPin, Package, Settings } from "lucide-react";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";

const PROFILE_NAV = [
  { href: "/profile", label: "Overview", icon: Settings },
  { href: "/profile/orders", label: "My orders", icon: Package },
  { href: "/profile/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile/addresses", label: "Addresses", icon: MapPin },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, ready, logout } = useCustomerAuth();

  useEffect(() => {
    if (ready && !customer) router.replace("/login");
  }, [ready, customer, router]);

  async function signOut() {
    await logout();
    router.replace("/");
    router.refresh();
  }

  if (!ready) return <main className="min-h-[60vh] animate-pulse bg-paper-2/40" />;
  if (!customer) return null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-[28px] border border-line bg-paper p-4">
          <div className="border-b border-line px-3 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">Customer</p>
            <p className="mt-1 font-display text-xl font-bold">{customer.name}</p>
            <p className="truncate text-xs text-muted">{customer.email}</p>
          </div>
          <nav className="mt-3 space-y-1">
            {PROFILE_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-2"}`}>
                  <item.icon className="size-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
          <button onClick={signOut} className="mt-4 flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-clay hover:bg-clay/10">
            <LogOut className="size-4" /> Sign out
          </button>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
