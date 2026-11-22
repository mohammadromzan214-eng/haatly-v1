import Link from "next/link";
import { connection } from "next/server";
import { AlertTriangle, ArrowUpRight, Boxes, CircleDollarSign, PackageCheck, ShoppingBag, Store, Users } from "lucide-react";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { formatPrice } from "@/lib/site";
import { readAdminDashboard } from "@/lib/db/admin-management-repository";

function orderStatusLabel(status: string) {
  return ORDER_STATUSES.includes(status as OrderStatus)
    ? ORDER_STATUS_LABEL[status as OrderStatus]
    : status.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminDashboardPage() {
  await connection();
  let dashboard: Awaited<ReturnType<typeof readAdminDashboard>>;
  try {
    dashboard = await readAdminDashboard();
  } catch (error) {
    console.error("Could not load the admin dashboard.", error);
    return (
      <main className="px-5 py-10 md:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Dashboard</h1>
        <div role="alert" className="mt-6 rounded-[24px] border border-clay/30 bg-clay/5 p-6">
          <p className="font-semibold">Dashboard data is temporarily unavailable.</p>
          <p className="mt-1 text-sm text-muted">Check the database connection and try again.</p>
          <Link href="/admin" className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">Retry</Link>
        </div>
      </main>
    );
  }

  const metrics = [
    { label: "Total orders", value: dashboard.totalOrders.toLocaleString("en-IN"), detail: `${dashboard.openOrders} still in progress`, icon: ShoppingBag },
    { label: "Paid sales", value: formatPrice(dashboard.paidSales), detail: "Confirmed payments", icon: CircleDollarSign },
    { label: "Active products", value: dashboard.activeProducts.toLocaleString("en-IN"), detail: `${dashboard.lowStockCount} need stock attention`, icon: Boxes },
    { label: "Customers", value: dashboard.activeCustomers.toLocaleString("en-IN"), detail: "Active accounts", icon: Users },
    { label: "Partner shops", value: dashboard.activePartnerShops.toLocaleString("en-IN"), detail: "Currently selling", icon: Store },
  ];

  return (
    <main className="pb-16">
      <header className="border-b border-line px-5 py-8 md:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-muted">A live snapshot of Haatly orders, sales, catalogue, and customers.</p>
      </header>

      <section className="grid gap-4 px-5 py-6 sm:grid-cols-2 xl:grid-cols-5 md:px-10">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-[24px] border border-line bg-paper p-5">
            <div className="flex items-center justify-between text-muted">
              <span className="text-sm font-semibold">{metric.label}</span>
              <metric.icon className="size-4" />
            </div>
            <p className="mt-4 font-display text-2xl font-bold">{metric.value}</p>
            <p className="mt-1 text-xs text-muted">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 px-5 md:grid-cols-[1.4fr_1fr] md:px-10">
        <article className="overflow-hidden rounded-[26px] border border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-bold">Recent orders</h2>
              <p className="mt-1 text-xs text-muted">Latest customer purchases</p>
            </div>
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-forest">All orders <ArrowUpRight className="size-4" /></Link>
          </div>
          {dashboard.recentOrders.length ? (
            <div className="divide-y divide-line">
              {dashboard.recentOrders.map((order) => (
                <Link key={order.code} href="/admin/orders" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-paper-2/50">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold">{order.code}</p>
                    <p className="mt-1 truncate text-sm">{order.customerName || "Guest customer"} <span className="text-muted">· {formatDate(order.placedAt)}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold">{orderStatusLabel(order.status)}</span>
                    <span className="text-right text-sm font-bold">{formatPrice(order.total)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="px-5 py-8 text-sm text-muted">Orders will appear here after the first purchase.</p>}
        </article>

        <article className="overflow-hidden rounded-[26px] border border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-bold">Stock attention</h2>
              <p className="mt-1 text-xs text-muted">{dashboard.lowStockCount} item{dashboard.lowStockCount === 1 ? "" : "s"} at or below threshold</p>
            </div>
            <AlertTriangle className="size-5 text-clay" />
          </div>
          {dashboard.lowStockProducts.length ? (
            <div className="divide-y divide-line">
              {dashboard.lowStockProducts.map((product) => (
                <Link key={product.id} href="/admin/inventory" className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-paper-2/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{product.title}</p>
                    <p className="mt-1 font-mono text-[10px] text-muted">{product.sku}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-clay/10 px-3 py-1 text-xs font-bold text-clay">{product.stock} left</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <PackageCheck className="mx-auto size-7 text-forest" />
              <p className="mt-2 text-sm font-semibold">Stock levels look good</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
