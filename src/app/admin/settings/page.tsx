"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAdminData, type AdminSettings } from "@/components/admin/AdminDataProvider";

const FIELDS: { key: keyof AdminSettings; label: string; type?: string }[] = [
  { key: "storeName", label: "Store name" },
  { key: "phone", label: "Phone numbers" },
  { key: "whatsapp", label: "WhatsApp number" },
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
  useEffect(() => { if (ready) setDraft(settings); }, [ready, settings]);
  if (!ready) return <div className="p-10">Loading business settings…</div>;
  return (
    <div className="p-5 md:p-10">
      <header><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">System</p><h1 className="mt-2 font-display text-4xl font-extrabold">Business settings</h1><p className="mt-2 text-sm text-muted">Store identity and social channels. Saved locally in mock mode.</p></header>
      <form onSubmit={(event) => { event.preventDefault(); setSettings(draft); setSaved(true); }} className="mt-6 grid max-w-3xl gap-5 rounded-[26px] border border-line bg-paper p-5 sm:grid-cols-2 md:p-7">
        {FIELDS.map((field) => <label key={field.key} className="text-sm font-semibold">{field.label}<input type={field.type ?? "text"} value={draft[field.key]} onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" /></label>)}
        <div className="flex items-center gap-4 sm:col-span-2"><button className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper"><Save className="size-4" />Save settings</button>{saved && <span role="status" className="text-sm font-semibold text-forest">Saved locally.</span>}</div>
      </form>
    </div>
  );
}
