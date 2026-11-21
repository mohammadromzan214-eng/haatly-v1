"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";
import { Check, CircleAlert, LoaderCircle, MapPin, PackageCheck, UserRound } from "lucide-react";
import { cdn } from "@/lib/image";
import { formatPrice } from "@/lib/site";
import { paymentMethodLabel } from "@/lib/types";

interface ReceiptAddress {
  name: string;
  phone: string;
  district: string;
  area: string;
  address: string;
}

interface Receipt {
  code: string;
  phone: string;
  customerName: string;
  customerEmail: string | null;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string | null;
  paymentMessage: string;
  deliveryAddress: ReceiptAddress;
  billingAddress: ReceiptAddress;
  billingSameAsDelivery: boolean;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  couponCode: string | null;
  estimatedDelivery: string;
  items: Array<{ productId: string; title: string; image: string; quantity: number; unitPrice: number; sellerName: string }>;
}

export function CheckoutSuccess() {
  const { customer, register } = useCustomerAuth();
  const [receiptToken, setReceiptToken] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loadError, setLoadError] = useState("");
  const [claimState, setClaimState] = useState<"idle" | "linking" | "linked" | "error">("idle");
  const [claimError, setClaimError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [claimAttempt, setClaimAttempt] = useState(0);
  const claimStarted = useRef(false);

  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!token) {
      setLoadError("The order receipt link is missing. You can still track your order with its number and delivery mobile.");
      return;
    }
    setReceiptToken(token);
  }, []);

  useEffect(() => {
    if (!receiptToken) return;
    let active = true;
    fetch("/api/checkout/orders/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ receiptToken }),
    })
      .then(async (response) => {
        const result = await response.json() as { receipt?: Receipt; error?: string };
        if (!response.ok || !result.receipt) throw new Error(result.error ?? "Could not load this order receipt.");
        if (active) {
          setReceipt(result.receipt);
          setEmail(result.receipt.customerEmail ?? "");
        }
      })
      .catch((cause: unknown) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : "Could not load this order receipt.");
      });
    return () => { active = false; };
  }, [receiptToken]);

  useEffect(() => {
    if (!customer || !receiptToken || claimStarted.current) return;
    claimStarted.current = true;
    setClaimState("linking");
    fetch("/api/checkout/orders/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ receiptToken }),
    })
      .then(async (response) => {
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not link this order.");
        setClaimState("linked");
        setClaimError("");
      })
      .catch((cause: unknown) => {
        setClaimState("error");
        setClaimError(cause instanceof Error ? cause.message : "Could not link this order.");
      });
  }, [customer, receiptToken, claimAttempt]);

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");
    if (!receipt || password.length < 8) {
      setAccountError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setAccountError("Passwords do not match.");
      return;
    }
    setCreatingAccount(true);
    const result = await register({
      name: receipt.customerName,
      email: email.trim(),
      phone: receipt.phone,
      password,
    });
    setCreatingAccount(false);
    if (!result.ok) setAccountError(result.error ?? "Could not create your account.");
  }

  const loginNext = `/checkout/success${receiptToken ? `#${receiptToken}` : ""}`;

  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-forest text-paper"><Check className="size-8" strokeWidth={3} /></span>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.25em] text-forest">Order confirmed</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Your order has been placed successfully.</h1>
      </div>

      {!receipt && !loadError && <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" />Loading your order details…</p>}
      {loadError && <p role="alert" className="mt-8 flex items-start gap-2 rounded-2xl bg-clay/10 p-4 text-sm text-clay"><CircleAlert className="mt-0.5 size-4 shrink-0" />{loadError}</p>}

      {receipt && (
        <>
          <section className="mt-9 rounded-[28px] bg-ink p-6 text-paper md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper/15 pb-5">
              <div><p className="text-xs uppercase tracking-widest text-paper/60">Order number</p><p className="mt-1 font-mono text-2xl font-bold text-marigold">{receipt.code}</p></div>
              <div className="text-right">
                <span className="block rounded-full bg-paper/10 px-4 py-2 text-sm">{paymentMethodLabel(receipt.paymentMethod)}</span>
                <span className="mt-2 inline-block rounded-full bg-paper/10 px-3 py-1 text-xs capitalize">Payment {receipt.paymentStatus}</span>
              </div>
            </div>
            {receipt.paymentReference && <p className="mt-4 text-sm text-paper/75">Transaction reference: <span className="font-mono">{receipt.paymentReference}</span></p>}
            {receipt.paymentMessage && <p className="mt-4 rounded-2xl bg-paper/10 p-4 text-sm text-paper/80">{receipt.paymentMessage}</p>}
            <div className="mt-5 flex items-start gap-3">
              <PackageCheck className="mt-0.5 size-5 shrink-0 text-marigold" />
              <p><span className="font-semibold">Estimated delivery</span><br /><span className="text-sm text-paper/70">{receipt.estimatedDelivery} · our team will confirm your order by phone.</span></p>
            </div>
            <ul className="mt-6 divide-y divide-paper/10 border-y border-paper/10">
              {receipt.items.map((item) => (
                <li key={`${item.productId}-${item.title}`} className="flex items-center gap-3 py-4">
                  <img src={cdn(item.image, 96, 96)} alt="" className="size-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1"><p className="font-semibold">{item.title}</p><p className="text-xs text-paper/60">Qty {item.quantity} · {item.sellerName}</p></div>
                  <p className="shrink-0 text-sm font-semibold">{formatPrice(item.unitPrice * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-paper/70">Subtotal</dt><dd>{formatPrice(receipt.subtotal)}</dd></div>
              {receipt.discount > 0 && <div className="flex justify-between text-marigold"><dt>Discount{receipt.couponCode ? ` (${receipt.couponCode})` : ""}</dt><dd>−{formatPrice(receipt.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-paper/70">Delivery</dt><dd>{receipt.deliveryFee ? formatPrice(receipt.deliveryFee) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-paper/15 pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatPrice(receipt.total)}</dd></div>
            </dl>
          </section>

          <section className="mt-5 rounded-[24px] border border-line bg-paper p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold"><MapPin className="size-5 text-clay" /> Delivery address</h2>
            <p className="mt-3 leading-relaxed">{receipt.deliveryAddress.name}<br />{receipt.deliveryAddress.phone}<br />{receipt.deliveryAddress.address}<br />{receipt.deliveryAddress.area}, {receipt.deliveryAddress.district}</p>
            {!receipt.billingSameAsDelivery && (
              <div className="mt-5 border-t border-line pt-4">
                <h3 className="font-semibold">Billing address</h3>
                <p className="mt-2 text-sm leading-relaxed">{receipt.billingAddress.name}<br />{receipt.billingAddress.phone}<br />{receipt.billingAddress.address}<br />{receipt.billingAddress.area}, {receipt.billingAddress.district}</p>
              </div>
            )}
          </section>

          {customer ? (
            <section className="mt-5 rounded-[24px] border border-line bg-paper p-6">
              {claimState === "linked" ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-forest"><Check className="size-4" />This order is available in your account.</p>
              ) : claimState === "linking" ? (
                <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" />Linking this order to your account…</p>
              ) : (
                <>
                  {claimError && <p role="alert" className="mb-3 text-sm text-clay">{claimError}</p>}
                  <button type="button" onClick={() => { claimStarted.current = false; setClaimError(""); setClaimState("idle"); setClaimAttempt((attempt) => attempt + 1); }} className="text-sm font-semibold text-clay hover:underline">Link order to my account</button>
                </>
              )}
              {claimState === "linked" && <Link href="/profile/orders" className="mt-3 block text-sm font-semibold text-clay hover:underline">View my orders</Link>}
            </section>
          ) : (
            <section className="mt-5 rounded-[24px] border border-line bg-paper p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold"><UserRound className="size-5 text-clay" />Create an account to track future orders</h2>
              <p className="mt-2 text-sm text-ink-soft">Optional. Your order is already placed; account creation is not required.</p>
              <form onSubmit={createAccount} className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold sm:col-span-2">Email
                  <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" />
                </label>
                <label className="block text-sm font-semibold">Password
                  <input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" />
                </label>
                <label className="block text-sm font-semibold">Confirm password
                  <input type="password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none focus:border-ink" />
                </label>
                {accountError && <p role="alert" className="text-sm text-clay sm:col-span-2">{accountError} {accountError.includes("already exists") && <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="font-semibold underline">Sign in</Link>}</p>}
                <button type="submit" disabled={creatingAccount} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-clay disabled:opacity-60 sm:col-span-2">{creatingAccount ? "Creating account…" : "Create account (optional)"}</button>
              </form>
            </section>
          )}
        </>
      )}

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {receipt && <Link href={`/track-order?code=${encodeURIComponent(receipt.code)}`} className="rounded-full border border-line px-5 py-3 text-sm font-semibold hover:border-ink">Track this order</Link>}
        <Link href="/products" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-clay">Continue shopping</Link>
      </div>
    </main>
  );
}
