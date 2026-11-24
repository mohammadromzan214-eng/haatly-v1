"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";

function AdminLoginFields() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        setError(result?.error ?? "Unable to sign in.");
        return;
      }

      const result = await response.json() as { role?: "super_admin" | "order_admin" };
      const defaultPath = result.role === "order_admin" ? "/admin/orders" : "/admin/inventory";
      const requested = searchParams.get("next");
      const permittedNext = result.role === "order_admin"
        ? requested === "/admin/orders" || requested === "/admin/payments"
        : requested?.startsWith("/admin/");
      router.replace(permittedNext && requested ? requested : defaultPath);
      router.refresh();
    } catch {
      setError("Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-12">
      <div className="w-full max-w-md rounded-[32px] bg-paper p-7 shadow-2xl md:p-10">
        <div className="grid size-12 place-items-center rounded-2xl bg-forest text-paper">
          <ShieldCheck className="size-6" />
        </div>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.25em] text-clay">TOQAEE administration</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Admin sign in</h1>
        <p className="mt-3 text-sm text-ink-soft">This area is restricted to authorized administrators.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold">Email</span>
            <input
              type="email"
              required
              maxLength={254}
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-paper-2/40 px-4 py-3 outline-none focus:border-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Password</span>
            <input
              type="password"
              required
              maxLength={1024}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-line bg-paper-2/40 px-4 py-3 outline-none focus:border-ink"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-semibold text-paper transition hover:bg-clay disabled:cursor-wait disabled:opacity-60"
          >
            <LockKeyhole className="size-4" />
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-muted">
          Sign in with administrator credentials issued by your site operator.
        </p>
      </div>
    </main>
  );
}

export function AdminLoginForm() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-ink" />}>
      <AdminLoginFields />
    </Suspense>
  );
}
