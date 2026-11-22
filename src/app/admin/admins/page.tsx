"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Shield, UserPlus } from "lucide-react";

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export default function OrderAdminsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", { cache: "no-store", credentials: "same-origin" });
      const result = await response.json() as { accounts?: AdminAccount[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load admin accounts.");
      setAccounts(result.accounts ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load admin accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not create the account.");
      setName("");
      setEmail("");
      setPassword("");
      setMessage("Order admin account created.");
      await loadAccounts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the account.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAccount(account: AdminAccount, update: { active: boolean } | { password: string }) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: account.id, ...update }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update the account.");
      setPasswordDrafts((current) => ({ ...current, [account.id]: "" }));
      setMessage("active" in update ? `Account ${update.active ? "enabled" : "disabled"}.` : "Password updated.");
      await loadAccounts();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">System · Super admin</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Order admins</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">Create and manage accounts limited to order monitoring, confirmation, and payment verification.</p>
        </div>
        <button type="button" onClick={() => void loadAccounts()} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:border-ink">
          <RefreshCw className="size-4" /> Refresh
        </button>
      </header>

      {error && <p role="alert" className="mt-5 rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-2xl bg-forest/10 px-4 py-3 text-sm text-forest">{message}</p>}

      <form onSubmit={createAccount} className="mt-7 grid gap-4 rounded-[26px] border border-line bg-paper p-5 md:grid-cols-3 md:p-7">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold md:col-span-3"><UserPlus className="size-5 text-forest" /> Create order admin</h2>
        <label className="text-sm font-semibold">Name
          <input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" />
        </label>
        <label className="text-sm font-semibold">Email
          <input required type="email" maxLength={254} autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" />
        </label>
        <label className="text-sm font-semibold">Temporary password
          <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" />
        </label>
        <div className="md:col-span-3">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50">
            <Shield className="size-4" /> {saving ? "Saving…" : "Create account"}
          </button>
          <p className="mt-2 text-xs text-muted">Passwords must be at least 12 characters. The password is stored as a one-way hash.</p>
        </div>
      </form>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold">Existing accounts</h2>
        {loading && <p className="mt-4 text-sm text-muted">Loading accounts…</p>}
        {!loading && accounts.length === 0 && <p className="mt-4 rounded-2xl border border-dashed border-line p-6 text-sm text-muted">No order-admin accounts have been created.</p>}
        <div className="mt-4 space-y-3">
          {accounts.map((account) => (
            <article key={account.id} className="grid gap-4 rounded-[24px] border border-line bg-paper p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="font-semibold">{account.name} <span className={`ml-2 rounded-full px-2.5 py-1 text-[11px] ${account.active ? "bg-forest/10 text-forest" : "bg-paper-2 text-muted"}`}>{account.active ? "Active" : "Disabled"}</span></h3>
                <p className="mt-1 text-sm text-ink-soft">{account.email}</p>
                <p className="mt-1 text-xs text-muted">Created {new Date(account.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs font-semibold text-muted">Reset password
                  <input
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={passwordDrafts[account.id] ?? ""}
                    onChange={(event) => setPasswordDrafts((current) => ({ ...current, [account.id]: event.target.value }))}
                    className="mt-1 block w-full min-w-48 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-ink"
                  />
                </label>
                <button type="button" disabled={saving || (passwordDrafts[account.id] ?? "").length < 12} onClick={() => void updateAccount(account, { password: passwordDrafts[account.id] ?? "" })} className="rounded-full border border-line px-4 py-2.5 text-xs font-semibold disabled:opacity-40">Reset</button>
                <button type="button" disabled={saving} onClick={() => void updateAccount(account, { active: !account.active })} className="rounded-full border border-line px-4 py-2.5 text-xs font-semibold disabled:opacity-40">{account.active ? "Disable" : "Enable"}</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
