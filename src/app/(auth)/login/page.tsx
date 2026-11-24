"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";
import { AuthField } from "@/components/auth/AuthField";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AuthShell } from "@/components/auth/AuthShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const nextPath = searchParams.get("next");
  const registerHref = nextPath === "/checkout" ? "/register?next=%2Fcheckout" : "/register";
  const googleError = searchParams.get("google_error");
  const googleErrorMessage = googleError === "unavailable"
    ? "Google sign-in is not configured yet. You can still sign in with email."
    : googleError
      ? "Google sign-in could not be completed. Please try again or sign in with email."
      : "";

  function validate() {
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setErrors({ form: result.error ?? "Unable to sign in." });
      return;
    }
    const requested = searchParams.get("next");
    const safeNext = requested === "/checkout" ||
      requested === "/checkout/success" ||
      requested?.startsWith("/checkout/success#") ||
      requested === "/profile" ||
      requested?.startsWith("/profile/")
      ? requested
      : "/profile";
    router.replace(safeNext);
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      description="Track orders, manage addresses and keep your wishlist close."
      footer={<><span>New to TOQAEE? </span><Link href={registerHref} className="font-semibold text-clay hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <AuthField id="login-email" label="Email" type="email" autoComplete="email" value={email} error={errors.email} onChange={(event) => setEmail(event.target.value)} />
        <AuthField id="login-password" label="Password" type="password" autoComplete="current-password" value={password} error={errors.password} onChange={(event) => setPassword(event.target.value)} />
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-clay hover:underline">Forgot password?</Link>
        </div>
        {errors.form && <p role="alert" className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">{errors.form}</p>}
        {googleErrorMessage && <p role="alert" className="rounded-2xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">{googleErrorMessage}</p>}
        <button type="submit" disabled={submitting} className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 font-semibold text-paper transition hover:bg-clay disabled:cursor-wait disabled:opacity-60">
          <LogIn className="size-4" /> {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <GoogleSignInButton next={nextPath === "/checkout" ? "/checkout" : "/profile"} />
    </AuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-ink" />}><LoginForm /></Suspense>;
}
