"use client";

import Link from "next/link";
import { useState } from "react";
import { ImagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import { cdn } from "@/lib/image";
import { formatPrice } from "@/lib/site";

export default function AdminProductsPage() {
  const { ready, products, categories, deleteProduct } = useAdminData();
  const [query, setQuery] = useState("");
  const categoryNames = Object.fromEntries(categories.map((category) => [category.slug, category.name]));
  const filtered = products.filter((product) => `${product.title} ${product.sku}`.toLowerCase().includes(query.trim().toLowerCase()));

  if (!ready) return <div className="p-10">Loading mock product catalogue…</div>;
  return (
    <div className="p-5 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Catalogue</p><h1 className="mt-2 font-display text-4xl font-extrabold">Products</h1><p className="mt-2 text-sm text-muted">{products.length} mock listings · seller ownership preserved</p></div>
        <Link href="/admin/products/add" className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-clay"><Plus className="size-4" />Add product</Link>
      </header>
      <label className="mt-7 flex max-w-md items-center gap-2 rounded-full border border-line bg-paper px-4 py-3"><Search className="size-4 text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title or SKU" className="w-full bg-transparent text-sm outline-none" /></label>
      <div className="mt-5 overflow-x-auto rounded-[24px] border border-line bg-paper">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-line bg-paper-2/60 font-mono text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Product</th><th className="px-3 py-3">SKU</th><th className="px-3 py-3">Category</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3 text-right">Price</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-line">
            {filtered.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={product.images[0]?.startsWith("data:") ? product.images[0] : cdn(product.images[0], 96, 96)} alt="" className="size-12 rounded-xl object-cover" /><div><p className="max-w-56 truncate font-semibold">{product.title}</p><p className="text-xs text-muted">{product.sourceType.replace("_", " ")}</p></div></div></td>
                <td className="px-3 py-3 font-mono text-xs">{product.sku}</td><td className="px-3 py-3">{categoryNames[product.categorySlug] ?? "Unassigned"}</td>
                <td className="px-3 py-3"><span className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-semibold">{product.status.replace("_", " ")}</span></td><td className="px-3 py-3">{product.stock}</td><td className="px-3 py-3 text-right font-semibold">{formatPrice(product.price)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><Link href={`/admin/products/${product.id}/edit`} aria-label={`Edit ${product.title}`} className="grid size-9 place-items-center rounded-full hover:bg-paper-2"><Pencil className="size-4" /></Link><button onClick={() => { if (window.confirm(`Delete “${product.title}”?`)) deleteProduct(product.id); }} aria-label={`Delete ${product.title}`} className="grid size-9 place-items-center rounded-full text-clay hover:bg-clay/10"><Trash2 className="size-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-10 text-center text-sm text-muted"><ImagePlus className="mx-auto mb-2 size-6" />No products match this search.</div>}
      </div>
    </div>
  );
}
