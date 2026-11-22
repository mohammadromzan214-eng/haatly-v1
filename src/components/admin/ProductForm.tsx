"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductStatus, SourceType } from "@/lib/types";
import { createAdminProduct, useAdminData, type AdminProduct } from "./AdminDataProvider";

const METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
] as const;
const STATUSES: ProductStatus[] = ["active", "draft", "out_of_stock"];
const SOURCES: SourceType[] = ["own_stock", "partner_shop", "pre_order"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold">{label}<span className="mt-2 block">{children}</span></label>;
}

export function ProductForm({ initial }: { initial?: AdminProduct }) {
  const router = useRouter();
  const { ready, categories, sellers, saveProduct } = useAdminData();
  const selectableSellers = sellers.filter((seller) => seller.active || seller.id === initial?.sellerId);
  const [form, setForm] = useState<AdminProduct>(() => createAdminProduct(initial));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setForm((current) => {
      const categorySlug = categories.some((category) => category.slug === current.categorySlug)
        ? current.categorySlug
        : categories[0]?.slug ?? "";
      const sellerId = sellers.some((seller) => seller.id === current.sellerId && seller.active)
        || current.sellerId === initial?.sellerId
        ? current.sellerId
        : sellers.find((seller) => seller.active)?.id ?? "";
      return categorySlug === current.categorySlug && sellerId === current.sellerId
        ? current
        : { ...current, categorySlug, sellerId };
    });
  }, [ready, categories, sellers, initial?.sellerId]);

  function update<K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.some((file) => !file.type.startsWith("image/"))) {
      setError("Choose image files only.");
      return;
    }
    if (selected.some((file) => file.size > 2 * 1024 * 1024)) {
      setError("Each image file must be 2 MB or smaller.");
      return;
    }
    Promise.all(selected.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
      reader.onerror = () => reject(new Error("Could not read image."));
      reader.readAsDataURL(file);
    }))).then((images) => {
      update("images", [...form.images.filter((image) => !image.startsWith("data:")), ...form.images.filter((image) => image.startsWith("data:")), ...images]);
      setError("");
    }).catch(() => setError("Could not read the selected images."));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.sku.trim() || form.price < 0
        || !categories.some((category) => category.slug === form.categorySlug)
        || !sellers.some((seller) => seller.id === form.sellerId
          && (seller.active || seller.id === initial?.sellerId))) {
      setError("Enter a product name, SKU, non-negative price, and available category and seller.");
      return;
    }
    const slug = form.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setSaving(true);
    try {
      const saved = await saveProduct({ ...form, slug, title: form.title.trim(), sku: form.sku.trim() });
      if (!saved) {
        setError("Product was not saved. Check the database error message.");
        return;
      }
      router.push("/admin/products");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="animate-pulse p-10 text-muted">Loading product data…</div>;

  return (
    <form onSubmit={submit} className="space-y-6 p-5 md:p-10">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Product name"><input required value={form.title} onChange={(e) => update("title", e.target.value)} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></Field>
        <Field label="SKU"><input required value={form.sku} onChange={(e) => update("sku", e.target.value)} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-mono font-normal" /></Field>
        <Field label="Category"><select value={form.categorySlug} onChange={(e) => update("categorySlug", e.target.value)} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal">{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></Field>
        <Field label="Seller / source">
          <div className="flex gap-2">
            <select value={form.sellerId} onChange={(e) => update("sellerId", e.target.value)} className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-3 font-normal">{selectableSellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name} ({seller.kind}{seller.active ? "" : ", paused"})</option>)}</select>
            <select value={form.sourceType} onChange={(e) => update("sourceType", e.target.value as SourceType)} className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-3 font-normal">{SOURCES.map((source) => <option key={source} value={source}>{source.replace("_", " ")}</option>)}</select>
          </div>
        </Field>
        <Field label="Price (BDT)"><input type="number" min="0" required value={form.price} onChange={(e) => update("price", Number(e.target.value))} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></Field>
        <Field label="Compare-at price"><input type="number" min="0" value={form.compareAtPrice ?? ""} onChange={(e) => update("compareAtPrice", e.target.value ? Number(e.target.value) : undefined)} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></Field>
        <Field label="Stock"><input type="number" min="0" value={form.stock} onChange={(e) => update("stock", Math.max(0, Number(e.target.value)))} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></Field>
        <Field label="Product status"><select value={form.status} onChange={(e) => update("status", e.target.value as ProductStatus)} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal">{STATUSES.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></Field>
        <Field label="Short description"><input value={form.shortDescription} onChange={(e) => update("shortDescription", e.target.value)} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></Field>
        <Field label="Pre-order dispatch"><input value={form.preorderEta ?? ""} onChange={(e) => update("preorderEta", e.target.value || undefined)} placeholder="e.g. 4 Dec" className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></Field>
        <Field label="Full description"><textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></Field>
        <div>
          <span className="text-sm font-semibold">Product image</span>
          <input type="file" accept="image/*" multiple onChange={(e) => uploadImages(e.target.files)} className="mt-2 block w-full text-sm" />
          <p className="mt-1 text-xs text-muted">Images are stored with this product, max 2 MB per image.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">{form.images.map((image, index) => <div key={`${index}-${image.slice(0, 24)}`} className="relative"><img src={image} alt={`Product image ${index + 1}`} className="size-24 rounded-2xl object-cover" /><button type="button" onClick={() => update("images", form.images.filter((_, imageIndex) => imageIndex !== index))} aria-label={`Remove product image ${index + 1}`} className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-ink text-xs text-paper">×</button></div>)}</div>
      <fieldset className="rounded-2xl border border-line p-4">
        <legend className="px-2 text-sm font-semibold">Payment methods accepted</legend>
        <div className="flex flex-wrap gap-4">{METHODS.map((method) => <label key={method.value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.paymentMethods.includes(method.value)} onChange={(e) => update("paymentMethods", e.target.checked ? [...form.paymentMethods, method.value] : form.paymentMethods.filter((value) => value !== method.value))} />{method.label}</label>)}</div>
      </fieldset>
      {error && <p role="alert" className="text-sm font-medium text-clay">{error}</p>}
      <div className="flex gap-3"><button disabled={saving} className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-clay disabled:opacity-50">{saving ? "Saving…" : "Save product"}</button><button type="button" onClick={() => router.push("/admin/products")} className="rounded-full border border-line px-6 py-3 text-sm font-semibold">Cancel</button></div>
    </form>
  );
}
