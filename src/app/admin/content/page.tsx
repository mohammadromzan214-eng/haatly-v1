"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAdminData, type AdminContentKey } from "@/components/admin/AdminDataProvider";

const FIELDS: { key: AdminContentKey; title: string }[] = [
  { key: "about", title: "About Us" },
  { key: "contact", title: "Contact Us" },
  { key: "faq", title: "FAQ" },
  { key: "privacy", title: "Privacy Policy" },
  { key: "returns", title: "Return Policy" },
  { key: "terms", title: "Terms & Conditions" },
];

export default function ContentPage() {
  const { ready, content, setContent } = useAdminData();
  const [draft, setDraft] = useState(content);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (ready) setDraft(content); }, [ready, content]);
  if (!ready) return <div className="p-10">Loading content…</div>;
  async function save() {
    setSaved(false);
    setError("");
    setSaving(true);
    try {
      const success = await setContent(draft);
      if (success) setSaved(true);
      else setError("Content was not saved. Check the database error message.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="p-5 md:p-10">
      <header><p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Store content</p><h1 className="mt-2 font-display text-4xl font-extrabold">Content management</h1><p className="mt-2 text-sm text-muted">Edit published page content. Changes are saved to the database.</p></header>
      <div className="mt-6 space-y-4">{FIELDS.map((field) => <label key={field.key} className="block rounded-[24px] border border-line bg-paper p-5 text-sm font-semibold">{field.title}<textarea rows={5} value={draft[field.key]} onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })} className="mt-3 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal leading-relaxed" /></label>)}</div>
      <div className="mt-5 flex items-center gap-4"><button disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50"><Save className="size-4" />{saving ? "Saving…" : "Save content"}</button>{saved && <span role="status" className="text-sm font-semibold text-forest">Saved to database.</span>}{error && <span role="alert" className="text-sm font-semibold text-clay">{error}</span>}</div>
    </div>
  );
}
