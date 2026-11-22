"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, CalendarClock, Handshake, Minus, PackageCheck, Plus, RotateCcw, Save, Search, Warehouse } from "lucide-react";
import { SOURCE_TYPE_LABEL, stockBadge } from "@/lib/catalog-utils";
import { cdn } from "@/lib/image";
import { formatPrice } from "@/lib/site";
import type { Category, Product, ProductStatus, SourceType } from "@/lib/types";
import type { AdminSeller } from "./AdminDataProvider";
import { StockBadge } from "../StockBadge";
import { useToast } from "../Providers";

type Row = Pick<Product, "id" | "sourceType" | "status" | "stock">;

const STATUS_LABEL: Record<ProductStatus, string> = { active: "Active", draft: "Draft", out_of_stock: "Out of Stock" };
const STATUS_STYLE: Record<ProductStatus, string> = {
  active: "bg-forest/10 text-forest",
  draft: "bg-paper-3 text-ink-soft",
  out_of_stock: "bg-clay/10 text-clay",
};

const SOURCE_TABS: { key: SourceType | "all"; label: string; icon: typeof Boxes }[] = [
  { key: "all", label: "All sources", icon: Boxes },
  { key: "own_stock", label: "Own Stock", icon: Warehouse },
  { key: "partner_shop", label: "Partner Shop", icon: Handshake },
  { key: "pre_order", label: "Pre-Order", icon: CalendarClock },
];

/**
 * UI inventory rules:
 * - Stock reaching 0 on an active own-stock / partner listing flips it to "Out of Stock".
 * - Restocking an "Out of Stock" listing flips it back to "Active".
 * - Pre-order stock is the reservation cap, so it never auto-flips status.
 * - Drafts are never changed automatically.
 */
function applyRules(next: Row, prev: Row): Row {
  if (next.status === "draft" || next.sourceType === "pre_order") return next;
  if (next.stock === 0 && next.status === "active") return { ...next, status: "out_of_stock" };
  if (next.stock > 0 && prev.stock === 0 && next.status === "out_of_stock") return { ...next, status: "active" };
  return next;
}

export function InventoryManager({ products, sellers, categories, onSave }: {
  products: Product[];
  sellers: AdminSeller[];
  categories: Category[];
  onSave?: (rows: Row[]) => void | boolean | Promise<void | boolean>;
}) {
  const notify = useToast();
  const initial = useMemo(() => Object.fromEntries(products.map((p) => [p.id, { id: p.id, sourceType: p.sourceType, status: p.status, stock: p.stock }])), [products]);
  const [saved, setSaved] = useState<Record<string, Row>>(initial);
  const [rows, setRows] = useState<Record<string, Row>>(initial);
  const [q, setQ] = useState("");
  const [source, setSource] = useState<SourceType | "all">("all");
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  const sellerById = useMemo(() => Object.fromEntries(sellers.map((s) => [s.id, s])), [sellers]);
  const catBySlug = useMemo(() => Object.fromEntries(categories.map((c) => [c.slug, c])), [categories]);

  const isLow = (p: Product, r: Row) => r.sourceType !== "pre_order" && r.status !== "draft" && r.stock <= p.lowStockThreshold;

  const dirtyIds = Object.keys(rows).filter((id) => {
    const a = rows[id], b = saved[id];
    return a.sourceType !== b.sourceType || a.status !== b.status || a.stock !== b.stock;
  });

  function update(id: string, patch: Partial<Row>) {
    setRows((cur) => ({ ...cur, [id]: applyRules({ ...cur[id], ...patch }, cur[id]) }));
  }

  async function saveChanges() {
    if (!onSave || saving) return;
    setSaving(true);
    try {
      if (await onSave(dirtyIds.map((id) => rows[id])) === false) return;
      setSaved({ ...rows });
      notify(`Inventory updated · ${dirtyIds.length} ${dirtyIds.length === 1 ? "listing" : "listings"}`);
    } catch {
      notify("Could not save inventory changes.");
    } finally {
      setSaving(false);
    }
  }

  const visible = products.filter((p) => {
    const r = rows[p.id];
    const needle = q.trim().toLowerCase();
    return (
      (source === "all" || r.sourceType === source) &&
      (status === "all" || r.status === status) &&
      (!lowOnly || isLow(p, r)) &&
      (!needle || `${p.title} ${p.sku} ${sellerById[p.sellerId]?.name}`.toLowerCase().includes(needle))
    );
  });

  const all = products.map((p) => ({ p, r: rows[p.id] }));
  const kpis = [
    { label: "Active listings", value: all.filter(({ r }) => r.status === "active").length.toString(), sub: `${all.filter(({ r }) => r.status === "draft").length} drafts` },
    { label: "Own-stock units", value: all.filter(({ r }) => r.sourceType === "own_stock").reduce((n, { r }) => n + r.stock, 0).toLocaleString("en-IN"), sub: "Tejgaon warehouse" },
    { label: "Own-stock value", value: formatPrice(all.filter(({ r }) => r.sourceType === "own_stock").reduce((n, { p, r }) => n + r.stock * p.price, 0)), sub: "at retail price" },
    { label: "Partner listings", value: all.filter(({ r }) => r.sourceType === "partner_shop").length.toString(), sub: `${sellers.filter((s) => s.kind === "partner" && s.active).length} active partner shops` },
    { label: "Pre-order slots", value: all.filter(({ r }) => r.sourceType === "pre_order").reduce((n, { r }) => n + r.stock, 0).toString(), sub: "reservations open" },
    { label: "Low-stock alerts", value: all.filter(({ p, r }) => isLow(p, r)).length.toString(), sub: "at or below threshold", alert: true },
  ];

  return (
    <div className="pb-32">
      <header className="border-b border-line px-5 py-8 md:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Catalogue · Inventory</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] md:text-5xl">Inventory</h1>
          <p className="text-sm text-muted">Adjust source, status and stock inline. Badges update automatically.</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <div key={k.label} className="animate-rise bg-paper px-5 py-5 md:px-6" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              {k.alert && <AlertTriangle className="size-3.5 text-clay" />}
              {k.label}
            </p>
            <p className={`mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl ${k.alert && k.value !== "0" ? "text-clay" : ""}`}>{k.value}</p>
            <p className="mt-0.5 text-xs text-muted">{k.sub}</p>
          </div>
        ))}
      </section>

      <section className="px-5 py-6 md:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-paper-2 p-1">
            {SOURCE_TABS.map((t) => {
              const count = t.key === "all" ? products.length : products.filter((p) => rows[p.id].sourceType === t.key).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setSource(t.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${source === t.key ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
                >
                  <t.icon className="size-4" /> {t.label}
                  <span className={`font-mono text-[11px] ${source === t.key ? "text-marigold" : "text-muted"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus | "all")}
            className="rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-medium outline-none focus:border-ink"
            aria-label="Filter by status"
          >
            <option value="all">Any status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button
            onClick={() => setLowOnly((v) => !v)}
            aria-pressed={lowOnly}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition ${lowOnly ? "border-clay bg-clay text-paper" : "border-line hover:border-ink"}`}
          >
            <AlertTriangle className="size-4" /> Low stock
          </button>
          <label className="ml-auto flex min-w-60 flex-1 items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 focus-within:border-ink md:max-w-xs">
            <Search className="size-4 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, SKU, seller" className="w-full bg-transparent text-sm outline-none" aria-label="Search inventory" />
          </label>
        </div>

        <div className="mt-6 overflow-x-auto rounded-[24px] border border-line bg-paper">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-line bg-paper-2/60 font-mono text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Seller</th>
                <th className="px-3 py-3 font-medium">Source type</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Storefront badge</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((p) => {
                const r = rows[p.id];
                const seller = sellerById[p.sellerId];
                const dirty = dirtyIds.includes(p.id);
                const low = isLow(p, r);
                return (
                  <tr key={p.id} className={`transition ${dirty ? "bg-marigold-soft/30" : "hover:bg-paper-2/40"}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative shrink-0">
                          <img src={cdn(p.images[0], 96, 96)} alt="" className="size-12 rounded-xl object-cover" />
                          {dirty && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-paper bg-marigold" title="Unsaved change" />}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[240px] truncate font-semibold">{p.title}</p>
                          <p className="font-mono text-xs text-muted">{p.sku} · {catBySlug[p.categorySlug]?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium">{seller?.name}</p>
                      <p className="text-xs text-muted">{seller?.kind === "platform" ? "Platform" : `Partner · ${seller?.commissionRate}% commission`}</p>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={r.sourceType}
                        onChange={(e) => update(p.id, { sourceType: e.target.value as SourceType })}
                        className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-ink"
                        aria-label={`Source type for ${p.title}`}
                      >
                        {Object.entries(SOURCE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => update(p.id, { status: e.target.value as ProductStatus })}
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none ring-1 ring-transparent focus:ring-ink ${STATUS_STYLE[r.status]}`}
                        aria-label={`Status for ${p.title}`}
                      >
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-line">
                          <button onClick={() => update(p.id, { stock: Math.max(0, r.stock - 1) })} className="grid size-8 place-items-center hover:bg-paper-2" aria-label="Decrease stock"><Minus className="size-3" /></button>
                          <input
                            type="number"
                            min={0}
                            value={r.stock}
                            onChange={(e) => update(p.id, { stock: Math.max(0, Number.parseInt(e.target.value || "0", 10)) })}
                            className="w-12 bg-transparent text-center font-mono text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                            aria-label={`Stock for ${p.title}`}
                          />
                          <button onClick={() => update(p.id, { stock: r.stock + 1 })} className="grid size-8 place-items-center hover:bg-paper-2" aria-label="Increase stock"><Plus className="size-3" /></button>
                        </div>
                        {low && <span className="text-xs font-semibold text-clay" title={`Threshold ${p.lowStockThreshold}`}>Low</span>}
                        {r.sourceType === "pre_order" && <span className="text-xs text-muted">cap</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <StockBadge badge={stockBadge(r)} eta={r.sourceType === "pre_order" ? p.preorderEta ?? "TBC" : undefined} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="font-semibold">{formatPrice(p.price)}</p>
                      {p.compareAtPrice && <p className="text-xs text-muted line-through">{formatPrice(p.compareAtPrice)}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <PackageCheck className="size-10 text-forest" strokeWidth={1.5} />
              <p className="mt-4 font-display text-xl font-semibold">No listings match these filters</p>
              <p className="mt-1 text-sm text-muted">Clear the search or pick a different source or status.</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 text-xs text-muted md:grid-cols-3">
          <p className="rounded-2xl bg-paper-2/60 p-4"><strong className="text-ink">Own Stock</strong> shows the <em>In Stock</em> badge and ships from the Tejgaon warehouse.</p>
          <p className="rounded-2xl bg-paper-2/60 p-4"><strong className="text-ink">Partner Shop</strong> shows the <em>Partner Shop</em> badge; the seller’s handover days are added to delivery estimates.</p>
          <p className="rounded-2xl bg-paper-2/60 p-4"><strong className="text-ink">Pre-Order</strong> shows the <em>Pre-Order</em> badge with its dispatch date; stock acts as the reservation cap.</p>
        </div>
      </section>

      {dirtyIds.length > 0 && (
        <div className="animate-rise fixed inset-x-0 bottom-5 z-40 mx-auto flex w-[min(640px,calc(100%-2.5rem))] items-center justify-between gap-4 rounded-full bg-ink py-2.5 pl-6 pr-2.5 text-paper shadow-[0_20px_50px_-15px_rgba(28,38,34,0.7)] lg:ml-[calc(50%-320px+8rem)]">
          <p className="text-sm"><strong className="font-mono text-marigold">{dirtyIds.length}</strong> unsaved {dirtyIds.length === 1 ? "change" : "changes"}</p>
          <div className="flex gap-2">
            <button onClick={() => setRows(saved)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-paper/80 hover:text-paper">
              <RotateCcw className="size-4" /> Discard
            </button>
            <button
              onClick={() => void saveChanges()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-marigold px-5 py-2 text-sm font-semibold text-ink hover:bg-marigold-soft disabled:opacity-50"
            >
              <Save className="size-4" /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
