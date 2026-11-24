"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";
import { AuthField } from "@/components/auth/AuthField";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const result = await forgotPassword(email);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Unable to process request.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot password?"
      description="Enter the email address associated with your TOQAEE account to receive a secure reset link."
      footer={<Link href="/login" className="font-semibold text-clay hover:underline">Back to sign in</Link>}
    >
      {sent ? (
        <div className="rounded-3xl border border-forest/20 bg-forest/10 p-5 text-center">
          <MailCheck className="mx-auto size-8 text-forest" />
          <p className="mt-3 font-semibold">If an account exists for that email, reset instructions will be sent shortly.</p>
          <p className="mt-1 text-sm text-ink-soft">The reset link expires after 30 minutes. Check your spam folder if it does not arrive.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <AuthField id="forgot-email" label="Email" type="email" autoComplete="email" value={email} error={error} onChange={(event) => setEmail(event.target.value)} />
          <button type="submit" disabled={submitting} className="inline-flex h-13 w-full items-center justify-center rounded-full bg-ink px-6 py-3.5 font-semibold text-paper transition hover:bg-clay disabled:cursor-wait disabled:opacity-60">
            {submitting ? "Processing…" : "Request reset"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
