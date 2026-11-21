"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthShell } from "@/components/auth/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useCustomerAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!/^(?:\+?880|0)1[3-9]\d{8}$/.test(form.phone)) next.phone = "Enter a valid Bangladesh mobile number.";
    if (form.password.length < 8) next.password = "Use at least 8 characters.";
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const result = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    setSubmitting(false);
    if (!result.ok) {
      setErrors({ form: result.error ?? "Unable to create account." });
      return;
    }
    const requested = new URLSearchParams(window.location.search).get("next");
    router.replace(requested === "/checkout" ? "/checkout" : "/profile");
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Join the haat"
      title="Create account"
      description="A faster checkout and one place for all your Haatly orders."
      footer={<><span>Already registered? </span><Link href="/login" className="font-semibold text-clay hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <AuthField id="register-name" label="Full name" type="text" autoComplete="name" value={form.name} error={errors.name} onChange={(event) => update("name", event.target.value)} />
        <AuthField id="register-email" label="Email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={(event) => update("email", event.target.value)} />
        <AuthField id="register-phone" label="Mobile number" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={form.phone} error={errors.phone} onChange={(event) => update("phone", event.target.value)} />
        <AuthField id="register-password" label="Password" type="password" autoComplete="new-password" value={form.password} error={errors.password} onChange={(event) => update("password", event.target.value)} />
        <AuthField id="register-confirm" label="Confirm password" type="password" autoComplete="new-password" value={form.confirmPassword} error={errors.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} />
        {errors.form && <p role="alert" className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">{errors.form}</p>}
        <button type="submit" disabled={submitting} className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-semibold text-paper transition hover:bg-clay disabled:cursor-wait disabled:opacity-60">
          <UserPlus className="size-4" /> {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <GoogleSignInButton />
    </AuthShell>
  );
}
