"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAdminData, type AdminSettings } from "@/components/admin/AdminDataProvider";

const FIELDS: { key: keyof AdminSettings; label: string; type?: string }[] = [
  { key: "storeName", label: "Store name" },
  { key: "phone", label: "Phone numbers" },
  { key: "whatsapp", label: "WhatsApp number" },
  { key: "bkashNumber", label: "bKash mock payment number" },
  { key: "nagadNumber", label: "Nagad mock payment number" },
  { key: "email", label: "Email", type: "email" },
  { key: "facebook", label: "Facebook URL", type: "url" },
  { key: "instagram", label: "Instagram URL", type: "url" },
  { key: "youtube", label: "YouTube URL", type: "url" },
  { key: "address", label: "Business address" },
];

export default function SettingsPage() {
  const { ready, settings, setSettings } = useAdminData();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (ready) setDraft(settings); }, [ready, settings]);
  if (!ready) return <div className="p-10">Loading business settings…</div>;
  return (
    <div className="p-5 md:p-10">
      <header><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">System</p><h1 className="mt-2 font-display text-4xl font-extrabold">Business settings</h1><p className="mt-2 text-sm text-muted">Store identity, contact channels, storefront notice, and manual mock-payment numbers.</p></header>
      <form onSubmit={async (event) => { event.preventDefault(); setSaved(false); setSaving(true); try { setSaved(await setSettings(draft)); } finally { setSaving(false); } }} className="mt-6 grid max-w-3xl gap-5 rounded-[26px] border border-line bg-paper p-5 sm:grid-cols-2 md:p-7">
        {FIELDS.map((field) => <label key={field.key} className="text-sm font-semibold">{field.label}<input type={field.type ?? "text"} value={draft[field.key]} onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" /></label>)}
        <label className="text-sm font-semibold sm:col-span-2">Storefront notice
          <textarea maxLength={240} value={draft.announcement} onChange={(e) => setDraft({ ...draft, announcement: e.target.value })} rows={2} placeholder="Optional announcement shown at the top of the storefront" className="mt-2 w-full resize-y rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" />
          <span className="mt-1 block text-xs font-normal text-muted">Up to 240 characters. Leave empty to hide it.</span>
        </label>
        <p className="text-xs text-muted sm:col-span-2">bKash/Nagad are mock/manual only; no live payment gateway is connected. Orders using them remain pending until an admin verifies payment.</p>
        <div className="flex items-center gap-4 sm:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50"><Save className="size-4" />{saving ? "Saving…" : "Save settings"}</button>{saved && <span role="status" className="text-sm font-semibold text-forest">Saved to database.</span>}</div>
      </form>
    </div>
  );
}
