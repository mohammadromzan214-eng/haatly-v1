"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import { Logo } from "../Logo";
import { ADMIN_NAV } from "./nav";
import type { AdminRole } from "@/lib/admin-types";

export function AdminSidebar({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const homeHref = role === "order_admin" ? "/admin/orders" : "/admin";

  const nav = (
    <nav className="space-y-6">
      {ADMIN_NAV.map((g) => ({ ...g, items: g.items.filter((item) => item.roles.includes(role)) }))
        .filter((g) => g.items.length > 0)
        .map((g) => (
        <div key={g.group}>
          <p className="px-3 font-mono text-[10px] uppercase tracking-[0.25em] text-paper/40">{g.group}</p>
          <ul className="mt-2 space-y-0.5">
            {g.items.map((item) => {
              const active = pathname === item.href;
              const body = (
                <>
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {!item.ready && <span className="rounded bg-paper/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper/50">Soon</span>}
                </>
              );
              return (
                <li key={item.href}>
                  {item.ready ? (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-paper text-ink" : "text-paper/80 hover:bg-paper/10 hover:text-paper"}`}
                    >
                      {body}
                    </Link>
                  ) : (
                    <span className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2 text-sm text-paper/45" title="On the roadmap">
                      {body}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between bg-ink px-5 py-3 lg:hidden">
        <Logo tone="paper" href={homeHref} />
        <button onClick={() => setOpen((v) => !v)} className="text-paper" aria-label="Admin menu" aria-expanded={open}>
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
      {open && (
        <div className="animate-fade bg-ink px-4 pb-6 lg:hidden">
          {nav}
          <form action="/api/admin/logout" method="post" className="mt-4">
            <button type="submit" className="w-full rounded-xl border border-paper/15 px-3 py-2.5 text-left text-sm text-paper/80">
              Sign out
            </button>
          </form>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-ink px-4 py-6 lg:flex">
        <div className="px-3">
          <Logo tone="paper" href={homeHref} />
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-marigold">
            {role === "super_admin" ? "Super admin" : "Order admin"}
          </p>
        </div>
        <div className="mt-8 flex-1">{nav}</div>
        <div className="mt-6 space-y-2">
          <Link href="/" className="flex items-center gap-2 rounded-xl border border-paper/15 px-3 py-2.5 text-sm text-paper/80 hover:border-paper/40 hover:text-paper">
            <ExternalLink className="size-4" /> View storefront
          </Link>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="w-full rounded-xl border border-paper/15 px-3 py-2.5 text-left text-sm text-paper/80 hover:border-paper/40 hover:text-paper">
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
