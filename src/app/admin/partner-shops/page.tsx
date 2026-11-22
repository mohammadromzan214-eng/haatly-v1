"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Plus, Store, X } from "lucide-react";
import { useAdminData } from "@/components/admin/AdminDataProvider";

interface PartnerShop {
  id: string;
  slug: string;
  name: string;
  area: string;
  city: string;
  commissionRate: number;
  handoverDays: number;
  active: boolean;
  productCount: number;
}

interface ShopForm {
  id?: string;
  slug: string;
  name: string;
  area: string;
  city: string;
  commissionRate: number;
  handoverDays: number;
  active: boolean;
}

const EMPTY_FORM: ShopForm = {
  slug: "",
  name: "",
  area: "",
  city: "",
  commissionRate: 0,
  handoverDays: 1,
  active: true,
};

function readError(result: { error?: string }, fallback: string) {
  return typeof result.error === "string" ? result.error : fallback;
}

export default function PartnerShopsPage() {
  const { refresh } = useAdminData();
  const [shops, setShops] = useState<PartnerShop[]>([]);
  const [form, setForm] = useState<ShopForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadShops = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/partners", { cache: "no-store" });
      const result = await response.json() as { shops?: PartnerShop[]; error?: string };
      if (!response.ok) throw new Error(readError(result, "Could not load partner shops."));
      setShops(result.shops ?? []);
      setError("");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load partner shops.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShops();
  }, [loadShops]);

  function update<K extends keyof ShopForm>(key: K, value: ShopForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function editShop(shop: PartnerShop) {
    setForm({
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      area: shop.area,
      city: shop.city,
      commissionRate: shop.commissionRate,
      handoverDays: shop.handoverDays,
      active: shop.active,
    });
    setError("");
    setMessage("");
  }

  async function saveShop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/partners", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json() as { shop?: PartnerShop; error?: string };
      if (!response.ok || !result.shop) throw new Error(readError(result, "Could not save this partner shop."));
      setMessage(form.id ? "Partner shop updated." : "Partner shop created.");
      setForm(EMPTY_FORM);
      await Promise.all([loadShops(), refresh()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this partner shop.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleShop(shop: PartnerShop) {
    setUpdatingId(shop.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/partners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...shop, active: !shop.active }),
      });
      const result = await response.json() as { shop?: PartnerShop; error?: string };
      if (!response.ok || !result.shop) throw new Error(readError(result, "Could not update partner shop status."));
      setShops((current) => current.map((item) => item.id === shop.id ? result.shop! : item));
      setMessage(`${shop.name} is now ${result.shop.active ? "active" : "paused"}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update partner shop status.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="pb-16">
      <header className="border-b border-line px-5 py-8 md:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Catalogue · Marketplace</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Partner shops</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Create shop profiles and manage their commission and dispatch settings. Pausing a shop hides its products but keeps order and product history.</p>
      </header>

      <div className="grid gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)] md:px-10">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Shop directory</h2>
            <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold">{shops.length} shops</span>
          </div>
          {loading ? (
            <div className="animate-pulse rounded-[24px] border border-line bg-paper p-8 text-sm text-muted">Loading partner shops…</div>
          ) : shops.length ? (
            <div className="space-y-3">
              {shops.map((shop) => (
                <article key={shop.id} className="rounded-[24px] border border-line bg-paper p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-forest/10 text-forest"><Store className="size-5" /></div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-bold">{shop.name}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${shop.active ? "bg-forest/10 text-forest" : "bg-paper-2 text-muted"}`}>{shop.active ? "Active" : "Paused"}</span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-muted">/{shop.slug} · {shop.area ? `${shop.area}, ` : ""}{shop.city}</p>
                        <p className="mt-3 text-xs text-muted">{shop.commissionRate}% commission <span className="px-1">·</span> {shop.handoverDays} handover day{shop.handoverDays === 1 ? "" : "s"} <span className="px-1">·</span> {shop.productCount} product{shop.productCount === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => editShop(shop)} className="grid size-10 place-items-center rounded-full border border-line hover:bg-paper-2" aria-label={`Edit ${shop.name}`}><Pencil className="size-4" /></button>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => toggleShop(shop)} disabled={updatingId === shop.id} className={`text-xs font-semibold disabled:opacity-50 ${shop.active ? "text-clay" : "text-forest"}`}>
                      {updatingId === shop.id ? "Updating…" : shop.active ? "Pause shop" : "Enable shop"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="rounded-[24px] border border-line bg-paper p-8 text-sm text-muted">No partner shops yet. Add the first shop using the form.</div>}
        </section>

        <aside>
          <form onSubmit={saveShop} className="space-y-4 rounded-[26px] border border-line bg-paper p-5 md:p-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-clay">{form.id ? "Shop settings" : "New partner"}</p>
              <h2 className="mt-1 font-display text-xl font-bold">{form.id ? "Edit shop" : "Add a shop"}</h2>
            </div>
            <label className="block text-sm font-semibold">Shop name<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal" /></label>
            <label className="block text-sm font-semibold">Shop URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={form.slug} onChange={(event) => update("slug", event.target.value.toLowerCase())} placeholder="example-shop" className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-mono font-normal" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">Area<input maxLength={120} value={form.area} onChange={(event) => update("area", event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3 font-normal" /></label>
              <label className="block text-sm font-semibold">City<input required minLength={2} maxLength={100} value={form.city} onChange={(event) => update("city", event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3 font-normal" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">Commission (%)<input type="number" required min="0" max="100" step="0.01" value={form.commissionRate} onChange={(event) => update("commissionRate", Number(event.target.value))} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3 font-normal" /></label>
              <label className="block text-sm font-semibold">Handover days<input type="number" required min="0" max="365" step="1" value={form.handoverDays} onChange={(event) => update("handoverDays", Number(event.target.value))} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-3 font-normal" /></label>
            </div>
            {error && <p role="alert" className="rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>}
            {message && <p role="status" className="rounded-xl bg-forest/10 px-4 py-3 text-sm text-forest">{message}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50">
                {form.id ? <Check className="size-4" /> : <Plus className="size-4" />}{saving ? "Saving…" : form.id ? "Save changes" : "Create shop"}
              </button>
              {form.id && <button type="button" onClick={() => { setForm(EMPTY_FORM); setError(""); setMessage(""); }} className="grid size-11 place-items-center rounded-full border border-line hover:bg-paper-2" aria-label="Cancel editing"><X className="size-4" /></button>}
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}
