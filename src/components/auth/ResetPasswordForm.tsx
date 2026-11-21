"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthField } from "@/components/auth/AuthField";
import { AuthShell } from "@/components/auth/AuthShell";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (password.length < 8 || password.length > 128) {
      nextErrors.password = "Use a password between 8 and 128 characters.";
    }
    if (password !== confirmation) nextErrors.confirmation = "Passwords do not match.";
    if (!token) nextErrors.form = "This password reset link is invalid or has expired.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setErrors({ form: result.error ?? "Could not reset your password." });
        return;
      }
      setPassword("");
      setConfirmation("");
      setComplete(true);
    } catch {
      setErrors({ form: "Could not reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={complete ? "Password updated" : "Choose a new password"}
      description={complete
        ? "Your password has been changed. Sign in with your new password."
        : "Choose a strong password you have not used for this account before."}
      footer={<Link href="/login" className="font-semibold text-clay hover:underline">Back to sign in</Link>}
    >
      {complete ? (
        <div role="status" className="rounded-3xl border border-forest/20 bg-forest/10 p-5 text-center">
          <p className="font-semibold">Your password has been reset successfully.</p>
          <Link href="/login" className="mt-4 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-clay">
            Sign in
          </Link>
        </div>
      ) : !token ? (
        <div>
          <p role="alert" className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/forgot-password" className="mt-4 inline-flex text-sm font-semibold text-clay hover:underline">
            Request another reset link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <AuthField
            id="reset-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            value={password}
            error={errors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <AuthField
            id="reset-confirmation"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            value={confirmation}
            error={errors.confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          {errors.form && <p role="alert" className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">{errors.form}</p>}
          <button type="submit" disabled={submitting} className="inline-flex h-13 w-full items-center justify-center rounded-full bg-ink px-6 py-3.5 font-semibold text-paper transition hover:bg-clay disabled:cursor-wait disabled:opacity-60">
            {submitting ? "Updating password…" : "Reset password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
