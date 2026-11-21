"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useCustomerAuth, type CustomerAddress } from "@/components/CustomerAuthProvider";

type AddressForm = Omit<CustomerAddress, "id">;
const EMPTY: AddressForm = { label: "Home", name: "", phone: "", area: "", city: "", details: "", default: false };

export default function ProfileAddressesPage() {
  const { addresses, saveAddress, deleteAddress, error: persistenceError } = useCustomerAuth();
  const [form, setForm] = useState<AddressForm>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function startEdit(address: CustomerAddress) {
    const { id, ...values } = address;
    setForm(values);
    setEditing(id);
    setOpen(true);
    setError("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.area.trim() || !form.city.trim() || !form.details.trim()) {
      setError("Complete all address fields.");
      return;
    }
    if (!/^(?:\+?880|0)1[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ""))) {
      setError("Enter a valid Bangladesh mobile number.");
      return;
    }
    const saved = await saveAddress(form, editing ?? undefined);
    if (!saved) return;
    setOpen(false);
    setEditing(null);
    setForm(EMPTY);
    setError("");
  }

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Account</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-4xl font-bold tracking-tight">Addresses</h1><p className="mt-2 text-sm text-ink-soft">Saved locally in this browser for mock mode.</p></div>
        <button onClick={() => { setForm(EMPTY); setEditing(null); setOpen((value) => !value); }} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-clay"><Plus className="size-4" /> Add address</button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-clay">{error}</p>}
      {persistenceError && <p role="alert" className="mt-2 text-sm font-medium text-clay">{persistenceError}</p>}

      {open && (
        <form onSubmit={submit} className="mt-6 rounded-[28px] border border-line bg-paper p-5 md:p-6">
          <h2 className="font-display text-xl font-bold">{editing ? "Edit address" : "New address"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Label<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-normal" required /></label>
            <label className="text-sm font-semibold">Recipient name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-normal" required /></label>
            <label className="text-sm font-semibold">Mobile number<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-normal" required /></label>
            <label className="text-sm font-semibold">Area<input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-normal" required /></label>
            <label className="text-sm font-semibold">City / district<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-normal" required /></label>
            <label className="text-sm font-semibold sm:col-span-2">Street address<input value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-normal" required /></label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.default} onChange={(e) => setForm({ ...form, default: e.target.checked })} />Set as default delivery address</label>
          {error && <p role="alert" className="mt-3 text-sm text-clay">{error}</p>}
          <div className="mt-5 flex gap-2"><button className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">Save address</button><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold">Cancel</button></div>
        </form>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <article key={address.id} className="rounded-[26px] border border-line bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-paper-2"><MapPin className="size-5 text-clay" /></span><div><h2 className="font-display text-xl font-bold">{address.label}</h2>{address.default && <span className="text-xs font-semibold text-forest">Default address</span>}</div></div>
              <div className="flex gap-1"><button onClick={() => startEdit(address)} aria-label="Edit address" className="grid size-9 place-items-center rounded-full hover:bg-paper-2"><Pencil className="size-4" /></button><button onClick={() => { void deleteAddress(address.id); }} aria-label="Delete address" className="grid size-9 place-items-center rounded-full text-clay hover:bg-clay/10"><Trash2 className="size-4" /></button></div>
            </div>
            <p className="mt-4 text-sm font-semibold">{address.name} · {address.phone}</p><p className="mt-1 text-sm text-ink-soft">{address.details}, {address.area}, {address.city}</p>
          </article>
        ))}
      </div>
      {addresses.length === 0 && !open && <div className="mt-6 rounded-[28px] border border-dashed border-line py-14 text-center text-sm text-muted">No saved addresses yet. Add one to get started.</div>}
    </div>
  );
}
