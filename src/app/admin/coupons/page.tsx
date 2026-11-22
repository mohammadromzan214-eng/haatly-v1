"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAdminData, type AdminCoupon } from "@/components/admin/AdminDataProvider";
import { formatPrice } from "@/lib/site";

const EMPTY: Omit<AdminCoupon, "id"> = { code: "", label: "", percentOff: 10, maxDiscount: 500, expiresAt: "", active: true };

export default function CouponsPage() {
  const { ready, coupons, saveCoupon, deleteCoupon } = useAdminData();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function startEdit(coupon: AdminCoupon) {
    const { id, ...values } = coupon;
    setForm(values);
    setEditing(id);
    setOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.code.trim() || !form.label.trim() || form.percentOff < 1 || form.percentOff > 100 || form.maxDiscount < 0 || !form.expiresAt) {
      setError("Enter a code, description, valid discount, cap, and expiry date.");
      return;
    }
    setSaving(true);
    try {
      if (!await saveCoupon({ ...form, id: editing ?? `coupon_${Date.now().toString(36)}`, code: form.code.trim().toUpperCase() })) {
        setError("Coupon was not saved. Check the database error message.");
        return;
      }
      setForm(EMPTY);
      setOpen(false);
      setEditing(null);
      setError("");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-10">Loading coupons…</div>;
  return (
    <div className="p-5 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Marketing</p><h1 className="mt-2 font-display text-4xl font-extrabold">Coupons</h1><p className="mt-2 text-sm text-muted">Configure discount, maximum amount, expiry, and active state.</p></div><button onClick={() => { setForm(EMPTY); setEditing(null); setOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper"><Plus className="size-4" />Add coupon</button></header>
      {open && <form onSubmit={submit} className="mt-6 grid gap-4 rounded-[26px] border border-line bg-paper p-5 sm:grid-cols-2"><label className="text-sm font-semibold">Coupon code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-mono font-normal" required /></label><label className="text-sm font-semibold">Description<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" required /></label><label className="text-sm font-semibold">Percent discount<input type="number" min="1" max="100" value={form.percentOff} onChange={(e) => setForm({ ...form, percentOff: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></label><label className="text-sm font-semibold">Maximum discount (BDT)<input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: Number(e.target.value) })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></label><label className="text-sm font-semibold">Expiry date<input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" required /></label><label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Active</label>{error && <p role="alert" className="text-sm text-clay sm:col-span-2">{error}</p>}<div className="flex gap-2 sm:col-span-2"><button disabled={saving} className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50">{saving ? "Saving…" : "Save coupon"}</button><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-5 py-2.5 text-sm">Cancel</button></div></form>}
      <div className="mt-6 space-y-3">{coupons.map((coupon) => <article key={coupon.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-line bg-paper p-5"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-ink px-3 py-1.5 font-mono font-bold text-paper">{coupon.code}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${coupon.active ? "bg-forest/10 text-forest" : "bg-paper-2 text-muted"}`}>{coupon.active ? "Active" : "Inactive"}</span></div><p className="mt-2 font-semibold">{coupon.label}</p><p className="mt-1 text-xs text-muted">{coupon.percentOff}% off · up to {formatPrice(coupon.maxDiscount)} · expires {coupon.expiresAt}</p></div><div className="flex gap-2"><button onClick={() => startEdit(coupon)} aria-label="Edit coupon" className="grid size-10 place-items-center rounded-full hover:bg-paper-2"><Pencil className="size-4" /></button><button onClick={() => deleteCoupon(coupon.id)} aria-label="Delete coupon" className="grid size-10 place-items-center rounded-full text-clay hover:bg-clay/10"><Trash2 className="size-4" /></button></div></article>)}</div>
      {coupons.length === 0 && <div className="mt-8 rounded-[28px] border border-dashed border-line py-14 text-center text-sm text-muted">No coupons created.</div>}
    </div>
  );
}
