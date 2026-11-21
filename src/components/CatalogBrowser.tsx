"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PackageOpen, Search, SlidersHorizontal, X } from "lucide-react";
import { SOURCE_TYPE_LABEL } from "@/lib/catalog-utils";
import type { Category, Product, SourceType } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const SORTS = {
  popular: { label: "Most popular", fn: (a: Product, b: Product) => b.soldCount - a.soldCount },
  newest: { label: "Newest", fn: (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt) },
  price_asc: { label: "Price: low to high", fn: (a: Product, b: Product) => a.price - b.price },
  price_desc: { label: "Price: high to low", fn: (a: Product, b: Product) => b.price - a.price },
  rating: { label: "Top rated", fn: (a: Product, b: Product) => b.rating - a.rating },
} as const;
type SortKey = keyof typeof SORTS;

const PRICE_BANDS = [
  { key: "all", label: "Any price", test: () => true },
  { key: "u1000", label: "Under ৳1,000", test: (p: number) => p < 1000 },
  { key: "1000-4000", label: "৳1,000 – ৳4,000", test: (p: number) => p >= 1000 && p <= 4000 },
  { key: "o4000", label: "Over ৳4,000", test: (p: number) => p > 4000 },
] as const;

interface Props {
  products: Product[];
  categories: Category[];
  fixedCategory?: string;
  initial: { q?: string; source?: string; sort?: string; category?: string };
}

export function CatalogBrowser({ products, categories, fixedCategory, initial }: Props) {
  const pathname = usePathname();
  const [q, setQ] = useState(initial.q ?? "");
  const [category, setCategory] = useState(fixedCategory ?? initial.category ?? "all");
  const [source, setSource] = useState<SourceType | "all">(
    initial.source && initial.source in SOURCE_TYPE_LABEL ? (initial.source as SourceType) : "all",
  );
  const [sort, setSort] = useState<SortKey>(initial.sort && initial.sort in SORTS ? (initial.sort as SortKey) : "popular");
  const [band, setBand] = useState<(typeof PRICE_BANDS)[number]["key"]>("all");
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const [panel, setPanel] = useState(false);

  // Keep the URL shareable as filters change.
  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (source !== "all") params.set("source", source);
    if (sort !== "popular") params.set("sort", sort);
    if (!fixedCategory && category !== "all") params.set("category", category);
    const qs = params.toString();
    // Native history API: updates the address bar without a server round trip.
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }, [q, source, sort, category, fixedCategory, pathname]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const priceTest = PRICE_BANDS.find((b) => b.key === band)!.test;
    return products
      .filter((p) => category === "all" || p.categorySlug === category)
      .filter((p) => source === "all" || p.sourceType === source)
      .filter((p) => priceTest(p.price))
      .filter((p) => !hideSoldOut || p.status !== "out_of_stock")
      .filter((p) => !needle || `${p.title} ${p.shortDescription} ${p.tags.join(" ")} ${p.categorySlug}`.toLowerCase().includes(needle))
      .sort(SORTS[sort].fn);
  }, [products, category, source, band, hideSoldOut, q, sort]);

  const activeCount = [source !== "all", band !== "all", hideSoldOut, !fixedCategory && category !== "all", q.trim() !== ""].filter(Boolean).length;

  function reset() {
    setQ("");
    setSource("all");
    setBand("all");
    setHideSoldOut(false);
    if (!fixedCategory) setCategory("all");
  }

  const filters = (
    <div className="space-y-8">
      {!fixedCategory && (
        <fieldset>
          <legend className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">Category</legend>
          <div className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:items-start lg:gap-1">
            {[{ slug: "all", name: "Everything" }, ...categories].map((c) => (
              <button
                key={c.slug}
                onClick={() => setCategory(c.slug)}
                className={`rounded-full px-3 py-1.5 text-sm transition lg:rounded-lg ${category === c.slug ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">Ships from</legend>
        <div className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:items-start lg:gap-1">
          {(["all", "own_stock", "partner_shop", "pre_order"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`rounded-full px-3 py-1.5 text-sm transition lg:rounded-lg ${source === s ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
            >
              {s === "all" ? "All sources" : s === "own_stock" ? "In Stock (Haatly)" : SOURCE_TYPE_LABEL[s]}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">Price</legend>
        <div className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:items-start lg:gap-1">
          {PRICE_BANDS.map((b) => (
            <button
              key={b.key}
              onClick={() => setBand(b.key)}
              className={`rounded-full px-3 py-1.5 text-sm transition lg:rounded-lg ${band === b.key ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <span className={`relative h-6 w-10 rounded-full transition ${hideSoldOut ? "bg-forest" : "bg-line"}`}>
          <span className={`absolute top-1 size-4 rounded-full bg-paper transition-transform ${hideSoldOut ? "translate-x-5" : "translate-x-1"}`} />
        </span>
        <input type="checkbox" className="sr-only" checked={hideSoldOut} onChange={(e) => setHideSoldOut(e.target.checked)} />
        Hide out-of-stock
      </label>
    </div>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-44">{filters}</div>
      </aside>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 focus-within:border-ink">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by name, material, use…"
              className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="Filter products"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear search"><X className="size-4 text-muted" /></button>
            )}
          </label>
          <button
            onClick={() => setPanel((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-medium lg:hidden"
            aria-expanded={panel}
          >
            <SlidersHorizontal className="size-4" /> Filters {activeCount > 0 && <span className="rounded-full bg-clay px-1.5 text-xs text-paper">{activeCount}</span>}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-medium outline-none focus:border-ink"
            aria-label="Sort products"
          >
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {panel && <div className="animate-fade mt-4 rounded-3xl border border-line bg-paper-2/50 p-5 lg:hidden">{filters}</div>}

        <div className="mt-6 flex items-center justify-between text-sm text-muted">
          <p aria-live="polite"><strong className="text-ink">{results.length}</strong> {results.length === 1 ? "product" : "products"}</p>
          {activeCount > 0 && <button onClick={reset} className="font-semibold text-clay hover:underline">Clear filters</button>}
        </div>

        {results.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-[28px] border border-dashed border-line px-6 py-20 text-center">
            <PackageOpen className="size-12 text-clay" strokeWidth={1.5} />
            <h3 className="mt-5 font-display text-2xl font-semibold">Nothing on this shelf yet</h3>
            <p className="mt-2 max-w-sm text-ink-soft">Try a different price range or source, or browse everything we stock right now.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={reset} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-clay">Clear filters</button>
              <Link href="/products" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">All products</Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 xl:grid-cols-3">
            {results.map((p, i) => (
              <div key={p.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <ProductCard product={p} priority={i < 3} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
