"use client";

import { useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useAdminData, type AdminBanner } from "@/components/admin/AdminDataProvider";

const PLACEMENTS: AdminBanner["placement"][] = ["Hero", "Slider", "Promotional", "Campaign", "Featured section"];

export default function BannersPage() {
  const { ready, banners, setBanners } = useAdminData();
  const [form, setForm] = useState({ title: "", placement: "Promotional" as AdminBanner["placement"], image: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveBanners(next: AdminBanner[]) {
    setError("");
    setSaving(true);
    try {
      const saved = await setBanners(next);
      if (!saved) setError("Campaign changes were not saved. Check the database error message.");
      return saved;
    } finally {
      setSaving(false);
    }
  }

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.image) {
      setError("Enter a title and choose an image.");
      return;
    }
    if (!await saveBanners([{ ...form, id: `banner_${Date.now().toString(36)}`, title: form.title.trim(), active: true }, ...banners])) return;
    setForm({ title: "", placement: "Promotional", image: "" });
    setError("");
  }

  if (!ready) return <div className="p-10">Loading campaign data…</div>;
  return (
    <div className="p-5 md:p-10">
      <header><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Marketing</p><h1 className="mt-2 font-display text-4xl font-extrabold">Banners & offers</h1><p className="mt-2 text-sm text-muted">Manage the homepage hero, slider, promotions, campaigns, and featured sections.</p></header>
      <form onSubmit={add} className="mt-6 grid gap-4 rounded-[26px] border border-line bg-paper p-5 md:grid-cols-2"><label className="text-sm font-semibold">Banner / campaign title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></label><label className="text-sm font-semibold">Placement<select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as AdminBanner["placement"] })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal">{PLACEMENTS.map((placement) => <option key={placement}>{placement}</option>)}</select></label><ImageUpload value={form.image} onChange={(image) => setForm({ ...form, image })} label="Banner image" /><div className="flex flex-col items-start justify-end gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50"><Plus className="size-4" />{saving ? "Saving…" : "Add campaign"}</button>{error && <p role="alert" className="text-xs text-clay">{error}</p>}</div></form>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{banners.map((banner) => <article key={banner.id} className="overflow-hidden rounded-[24px] border border-line bg-paper"><img src={banner.image} alt="" className="h-40 w-full object-cover" /><div className="p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-bold">{banner.title}</h2><p className="text-xs text-muted">{banner.placement}</p></div><button disabled={saving} onClick={() => void saveBanners(banners.filter((item) => item.id !== banner.id))} aria-label={`Delete ${banner.title}`} className="grid size-9 place-items-center rounded-full text-clay hover:bg-clay/10 disabled:opacity-50"><Trash2 className="size-4" /></button></div><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" disabled={saving} checked={banner.active} onChange={(e) => void saveBanners(banners.map((item) => item.id === banner.id ? { ...item, active: e.target.checked } : item))} />Active</label></div></article>)}</div>
      {banners.length === 0 && <div className="mt-8 rounded-[28px] border border-dashed border-line py-14 text-center text-sm text-muted"><ImagePlus className="mx-auto mb-2 size-6" />No campaigns added.</div>}
    </div>
  );
}
