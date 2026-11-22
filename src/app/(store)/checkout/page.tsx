import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getBusinessSettings, listActiveCoupons } from "@/lib/catalog";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ coupon?: string }> }) {
  const [{ coupon = "" }, coupons, settings] = await Promise.all([searchParams, listActiveCoupons(), getBusinessSettings()]);
  return (
    <main className="mx-auto max-w-7xl px-5 pb-10">
      <CheckoutForm coupons={coupons} initialCoupon={coupon} paymentNumbers={{ bkashNumber: settings.bkashNumber, nagadNumber: settings.nagadNumber, phone: settings.phone }} />
    </main>
  );
}
