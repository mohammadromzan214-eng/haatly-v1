"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useAdminData } from "@/components/admin/AdminDataProvider";
import type { Category } from "@/lib/types";

const EMPTY: Category = { slug: "", name: "", blurb: "", image: "" };

export default function CategoriesPage() {
  const { ready, categories, products, saveCategory, deleteCategory } = useAdminData();
  const [form, setForm] = useState<Category>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function edit(category: Category) {
    setForm(category);
    setEditing(category.slug);
    setOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = form.slug || form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!form.name.trim() || !slug || !form.image) {
      setError("Name and category image are required.");
      return;
    }
    if (editing && editing !== slug && products.some((product) => product.categorySlug === editing)) {
      setError("Products use this category slug. Reassign them before changing the slug.");
      return;
    }
    setSaving(true);
    try {
      if (!await saveCategory({ ...form, slug, name: form.name.trim() })) {
        setError("Category was not saved. Check the database error message.");
        return;
      }
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
      setError("");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-10">Loading categories…</div>;
  return (
    <div className="p-5 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Catalogue</p><h1 className="mt-2 font-display text-4xl font-extrabold">Categories</h1></div><button onClick={() => { setForm(EMPTY); setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper"><Plus className="size-4" />Add category</button></header>
      {open && <form onSubmit={submit} className="mt-6 grid gap-4 rounded-[26px] border border-line bg-paper p-5 md:grid-cols-2"><label className="text-sm font-semibold">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editing ? form.slug : "" })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" required /></label><label className="text-sm font-semibold">Slug<input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="Generated from name" className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-mono font-normal" /></label><label className="text-sm font-semibold md:col-span-2">Description<input value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></label><ImageUpload value={form.image} onChange={(image) => setForm({ ...form, image })} label="Category image" />{error && <p role="alert" className="text-sm text-clay md:col-span-2">{error}</p>}<div className="flex gap-2 md:col-span-2"><button disabled={saving} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">{saving ? "Saving…" : "Save category"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-5 py-2.5 text-sm">Cancel</button></div></form>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => <article key={category.slug} className="flex gap-4 rounded-[24px] border border-line bg-paper p-4"><img src={category.image} alt="" className="size-20 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><h2 className="font-display text-xl font-bold">{category.name}</h2><p className="font-mono text-xs text-muted">{category.slug}</p><p className="mt-1 line-clamp-2 text-sm text-ink-soft">{category.blurb}</p><p className="mt-1 text-xs text-muted">{products.filter((product) => product.categorySlug === category.slug).length} products</p><div className="mt-2 flex gap-2"><button onClick={() => edit(category)} className="inline-flex items-center gap-1 text-xs font-semibold"><Pencil className="size-3" />Edit</button><button onClick={() => { if (categories.length <= 1) { setError("At least one category must remain."); return; } if (window.confirm(`Delete ${category.name}? Assigned products will move to another category.`)) void deleteCategory(category.slug); }} className="inline-flex items-center gap-1 text-xs font-semibold text-clay"><Trash2 className="size-3" />Delete</button></div></div></article>)}</div>
    </div>
  );
}
