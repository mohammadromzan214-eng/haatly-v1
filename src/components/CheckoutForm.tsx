"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, CircleAlert, LockKeyhole, MapPin, PackageCheck, UserRound } from "lucide-react";
import { useCustomerAuth } from "@/components/CustomerAuthProvider";
import type { AdminCoupon, AdminSettings } from "@/components/admin/AdminDataProvider";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useCart } from "@/components/Providers";
import { cdn } from "@/lib/image";
import { formatPrice, site } from "@/lib/site";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/types";

interface AddressForm {
  name: string;
  phone: string;
  district: string;
  area: string;
  address: string;
}

const EMPTY_ADDRESS: AddressForm = { name: "", phone: "", district: "", area: "", address: "" };

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = true,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label htmlFor={id} className="block text-sm font-semibold">
      {label}{required && <span className="text-clay"> *</span>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none transition focus:border-ink"
      />
    </label>
  );
}

function AddressFields({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: AddressForm;
  onChange: (next: AddressForm) => void;
}) {
  function update(key: keyof AddressForm, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${prefix}-name`} label="Full name" autoComplete="name" value={value.name} onChange={(next) => update("name", next)} />
      <Field id={`${prefix}-phone`} label="Mobile number" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={value.phone} onChange={(next) => update("phone", next)} />
      <Field id={`${prefix}-district`} label="District" autoComplete="address-level1" value={value.district} onChange={(next) => update("district", next)} />
      <Field id={`${prefix}-area`} label="Area / Upazila" autoComplete="address-level2" value={value.area} onChange={(next) => update("area", next)} />
      <div className="sm:col-span-2">
        <label htmlFor={`${prefix}-address`} className="block text-sm font-semibold">
          Full address <span className="text-clay">*</span>
          <textarea
            id={`${prefix}-address`}
            value={value.address}
            onChange={(event) => update("address", event.target.value)}
            required
            rows={3}
            autoComplete="street-address"
            className="mt-2 w-full resize-y rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none transition focus:border-ink"
          />
        </label>
      </div>
    </div>
  );
}

export function CheckoutForm({
  coupons,
  initialCoupon = "",
  paymentNumbers,
}: {
  coupons: AdminCoupon[];
  initialCoupon?: string;
  paymentNumbers: Pick<AdminSettings, "bkashNumber" | "nagadNumber" | "phone">;
}) {
  const router = useRouter();
  const { customer, addresses, ready: authReady } = useCustomerAuth();
  const { items, subtotal, ready: cartReady, clear } = useCart();
  const [delivery, setDelivery] = useState<AddressForm>(EMPTY_ADDRESS);
  const [billing, setBilling] = useState<AddressForm>(EMPTY_ADDRESS);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [billingSame, setBillingSame] = useState(true);
  const [couponText, setCouponText] = useState(initialCoupon);
  const [appliedCoupon, setAppliedCoupon] = useState<AdminCoupon | null>(
    () => coupons.find((coupon) => coupon.code.toUpperCase() === initialCoupon.trim().toUpperCase()) ?? null,
  );
  const [couponMessage, setCouponMessage] = useState(
    initialCoupon && !coupons.some((coupon) => coupon.code.toUpperCase() === initialCoupon.trim().toUpperCase())
      ? "This coupon is no longer active. You can continue without it."
      : "",
  );
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsReady, setPaymentMethodsReady] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const prefilled = useRef(false);
  const productIds = useMemo(() => items.map((item) => item.productId).join(","), [items]);

  useEffect(() => {
    if (!cartReady) return;
    if (!productIds) {
      setAvailableMethods([]);
      setPaymentMethodsReady(true);
      return;
    }
    let active = true;
    setPaymentMethodsReady(false);
    setPaymentMethodError("");
    setAvailableMethods([]);
    fetch(`/api/catalog/products?ids=${encodeURIComponent(productIds)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { products?: Array<{ id: string; paymentMethods?: PaymentMethod[] }>; error?: string };
        if (!response.ok || !result.products) throw new Error(result.error ?? "Could not load payment options.");
        const requestedIds = productIds.split(",");
        if (result.products.length !== requestedIds.length) throw new Error("One or more products are no longer available.");
        const supported = result.products.map((product) => product.paymentMethods ?? []);
        const methods = (["cod", "bkash", "nagad"] as const)
          .filter((method) => supported.every((productMethods) => productMethods.includes(method)));
        if (active) setAvailableMethods(methods);
      })
      .catch((cause: unknown) => {
        if (active) setPaymentMethodError(cause instanceof Error ? cause.message : "Could not load payment options.");
      })
      .finally(() => {
        if (active) setPaymentMethodsReady(true);
      });
    return () => { active = false; };
  }, [cartReady, productIds]);

  useEffect(() => {
    if (!authReady || prefilled.current) return;
    prefilled.current = true;
    const saved = addresses.find((address) => address.default) ?? addresses[0];
    if (customer || saved) {
      const next = {
        name: customer?.name ?? saved?.name ?? "",
        phone: customer?.phone ?? saved?.phone ?? "",
        district: saved?.city ?? "",
        area: saved?.area ?? "",
        address: saved?.details ?? "",
      };
      setDelivery(next);
      setBilling(next);
      setEmail(customer?.email ?? "");
    }
  }, [authReady, customer, addresses]);

  const discount = appliedCoupon
    ? Math.min(Math.round((subtotal * appliedCoupon.percentOff) / 100), appliedCoupon.maxDiscount)
    : 0;
  const deliveryFee = subtotal - discount >= site.delivery.freeOver
    ? 0
    : delivery.district.trim().toLowerCase() === "dhaka" ? site.delivery.insideDhaka : site.delivery.outsideDhaka;
  const total = subtotal - discount + deliveryFee;
  const itemsBySeller = useMemo(() => {
    const count = new Set(items.map((item) => item.sellerId)).size;
    return count;
  }, [items]);
  const configuredMethods = availableMethods.filter((method) => (
    method === "cod"
      || (method === "bkash" && paymentNumbers.bkashNumber.trim())
      || (method === "nagad" && paymentNumbers.nagadNumber.trim())
  ));
  const checkoutMethods = customer
    ? configuredMethods
    : configuredMethods.filter((method) => method === "cod");
  const checkoutMethodKey = checkoutMethods.join(",");

  useEffect(() => {
    if (!paymentMethodsReady) return;
    setPaymentMethod((current) => checkoutMethods.includes(current) ? current : checkoutMethods[0] ?? "cod");
  }, [checkoutMethodKey, paymentMethodsReady]);

  function applyCoupon() {
    const match = coupons.find((coupon) => coupon.code.toUpperCase() === couponText.trim().toUpperCase());
    if (!match) {
      setAppliedCoupon(null);
      setCouponMessage("That coupon is not valid or has expired.");
      return;
    }
    setAppliedCoupon(match);
    setCouponText(match.code);
    setCouponMessage(`${match.code} applied — ${match.label}.`);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!cartReady || items.length === 0) {
      setError("Your bag is empty.");
      return;
    }
    if (!paymentMethodsReady || checkoutMethods.length === 0 || !checkoutMethods.includes(paymentMethod)) {
      setError(paymentMethodError || "No payment method is available for every product in your bag.");
      return;
    }
    if (paymentMethod !== "cod" && !customer) {
      setError("Sign in to use bKash or Nagad. Guest checkout remains available with Cash on Delivery.");
      return;
    }
    if (!/^(?:\+?880|0)1[3-9]\d{8}$/.test(delivery.phone.trim())) {
      setError("Enter a valid Bangladesh mobile number for delivery.");
      return;
    }
    if (!billingSame && !/^(?:\+?880|0)1[3-9]\d{8}$/.test(billing.phone.trim())) {
      setError("Enter a valid Bangladesh mobile number for billing.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          deliveryAddress: delivery,
          billingAddress: billingSame ? undefined : billing,
          billingSameAsDelivery: billingSame,
          notes,
          couponCode: appliedCoupon?.code ?? null,
          paymentMethod,
          items: items.map((item) => ({ productId: item.productId, quantity: item.qty })),
        }),
      });
      const result = await response.json() as { receiptToken?: string; error?: string; redirectUrl?: string };
      if (!response.ok || !result.receiptToken) {
        throw new Error(result.error ?? "Could not place your order.");
      }
      clear();
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      router.push(`/checkout/success#${result.receiptToken}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cartReady && items.length === 0) {
    return (
      <div className="py-24 text-center">
        <PackageCheck className="mx-auto size-12 text-clay" />
        <h1 className="mt-5 font-display text-3xl font-bold">Your bag is empty</h1>
        <Link href="/products" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 font-semibold text-paper hover:bg-clay">Continue shopping</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-10 py-10 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
      <div>
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-clay"><ArrowLeft className="size-4" /> Back to bag</Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Almost there</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Checkout</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-4 py-2 text-sm font-semibold text-forest"><LockKeyhole className="size-4" /> Guest checkout available</span>
        </div>

        <div className="mt-7 rounded-[24px] border border-line bg-paper p-5 md:p-7">
          {customer ? (
            <p className="flex items-center gap-2 text-sm text-ink-soft"><UserRound className="size-4 text-forest" /> Signed in as <strong className="text-ink">{customer.email}</strong></p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Have an account? <Link href="/login?next=%2Fcheckout" className="font-semibold text-clay hover:underline">Sign in</Link>
                <span className="mx-2 text-line">·</span>
                <Link href="/register?next=%2Fcheckout" className="font-semibold text-clay hover:underline">Create one (optional)</Link>
              </p>
              <div className="max-w-sm"><GoogleSignInButton next="/checkout" /></div>
              <p className="text-xs text-muted">You can also continue as a guest with Cash on Delivery.</p>
            </div>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field id="checkout-email" label="Email (optional)" type="email" required={false} autoComplete="email" value={email} onChange={setEmail} placeholder="For order updates" />
          </div>
        </div>

        <section className="mt-5 rounded-[24px] border border-line bg-paper p-5 md:p-7">
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><MapPin className="size-5 text-clay" /> Delivery information</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Required fields are marked with an asterisk.</p>
          <AddressFields prefix="delivery" value={delivery} onChange={setDelivery} />
          <label htmlFor="checkout-notes" className="mt-4 block text-sm font-semibold">Order notes <span className="font-normal text-muted">(optional)</span>
            <textarea id="checkout-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full resize-y rounded-xl border border-line bg-paper px-4 py-3 font-normal outline-none transition focus:border-ink" placeholder="Delivery instructions or other details" />
          </label>
        </section>

        <section className="mt-5 rounded-[24px] border border-line bg-paper p-5 md:p-7">
          <h2 className="font-display text-2xl font-bold">Billing address</h2>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" checked={billingSame} onChange={(event) => setBillingSame(event.target.checked)} className="mt-0.5 size-4 accent-forest" />
            <span>Billing address is the same as delivery address</span>
          </label>
          {!billingSame && <div className="mt-5 border-t border-line pt-5"><AddressFields prefix="billing" value={billing} onChange={setBilling} /></div>}
        </section>

        <section className="mt-5 rounded-[24px] border border-line bg-paper p-5 md:p-7">
          <h2 className="font-display text-2xl font-bold">Payment method</h2>
          {paymentMethodError && <p role="alert" className="mt-3 text-sm text-clay">{paymentMethodError}</p>}
          {!paymentMethodsReady ? (
            <p className="mt-4 text-sm text-muted">Loading payment options…</p>
          ) : checkoutMethods.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {checkoutMethods.map((method) => (
                <label key={method} className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl border-2 p-4 ${paymentMethod === method ? "border-forest bg-forest/5" : "border-line"}`}>
                  <span className="flex items-start gap-3">
                    <input type="radio" name="payment-method" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} className="mt-1 size-4 accent-forest" />
                    <span>
                      <strong className="block">{PAYMENT_METHOD_LABEL[method]}</strong>
                      <span className="text-sm text-muted">{method === "cod" ? "Pay when your order arrives." : "Manual mock payment; an admin must verify it."}</span>
                      {paymentMethod === method && method !== "cod" && (
                        <span className="mt-2 block rounded-xl bg-paper-2 px-3 py-2 text-sm">
                          Manual number: <strong className="font-mono">{method === "bkash" ? paymentNumbers.bkashNumber : paymentNumbers.nagadNumber}</strong>
                          <span className="mt-1 block text-xs text-muted">
                            No live gateway is connected. After placing your order, contact support{paymentNumbers.phone ? ` at ${paymentNumbers.phone}` : ""} with your order and transaction IDs; payment stays pending until verified.
                          </span>
                        </span>
                      )}
                    </span>
                  </span>
                  {paymentMethod === method && <BadgeCheck className="size-5 shrink-0 text-forest" />}
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-paper-2 p-4 text-sm text-ink-soft">
              <p>No payment method is enabled for every item in your bag.</p>
              {!customer && availableMethods.some((method) => method !== "cod") && (
                <div className="mt-3 space-y-3">
                  <p>Sign in to use the available online methods: <Link href="/login?next=%2Fcheckout" className="font-semibold text-clay hover:underline">email login</Link>.</p>
                  <div className="max-w-sm"><GoogleSignInButton next="/checkout" /></div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-32">
        <div className="rounded-[28px] bg-ink p-6 text-paper md:p-7">
          <h2 className="font-display text-2xl font-bold">Order summary</h2>
          <ul className="mt-5 max-h-72 space-y-4 overflow-y-auto border-b border-paper/15 pb-5">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-3">
                <img src={cdn(item.image, 96, 96)} alt="" className="size-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-paper/60">Qty {item.qty} · {item.sellerName}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{formatPrice(item.price * item.qty)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <label htmlFor="checkout-coupon" className="text-xs font-semibold uppercase tracking-widest text-paper/60">Promo code</label>
            <div className="mt-2 flex gap-2">
              <input id="checkout-coupon" value={couponText} onChange={(event) => { setCouponText(event.target.value); setAppliedCoupon(null); setCouponMessage(""); }} className="min-w-0 flex-1 rounded-full bg-paper/10 px-4 py-2.5 font-mono text-sm uppercase outline-none ring-marigold focus:ring-2" />
              <button type="button" onClick={applyCoupon} className="rounded-full bg-paper/15 px-4 text-sm font-semibold hover:bg-paper/25">Apply</button>
            </div>
            {couponMessage && <p className={`mt-2 text-xs ${appliedCoupon ? "text-marigold" : "text-paper/60"}`}>{couponMessage}</p>}
          </div>

          <dl className="mt-5 space-y-3 border-t border-paper/15 pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-paper/70">Subtotal · {itemsBySeller} {itemsBySeller === 1 ? "parcel" : "parcels"}</dt><dd>{formatPrice(subtotal)}</dd></div>
            {discount > 0 && <div className="flex justify-between text-marigold"><dt>Discount ({appliedCoupon?.code})</dt><dd>−{formatPrice(discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-paper/70">Delivery</dt><dd>{deliveryFee ? formatPrice(deliveryFee) : "Free"}</dd></div>
            <div className="flex justify-between border-t border-paper/15 pt-4 text-lg font-bold"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
          </dl>

          {error && <p role="alert" className="mt-5 flex items-start gap-2 rounded-2xl bg-clay/20 p-3 text-sm text-paper"><CircleAlert className="mt-0.5 size-4 shrink-0 text-marigold" />{error}</p>}
          <button type="submit" disabled={submitting || !cartReady || !paymentMethodsReady || checkoutMethods.length === 0} className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-marigold px-6 font-semibold text-ink transition hover:bg-marigold-soft disabled:cursor-wait disabled:opacity-60">
            {submitting ? "Placing order…" : `Place order · ${formatPrice(total)}`}
          </button>
          <p className="mt-3 text-center text-xs text-paper/55">{paymentMethod === "cod" ? "No account required · Cash on Delivery" : "Signed-in customers · Payment pending verification"}</p>
        </div>
      </aside>
    </form>
  );
}
