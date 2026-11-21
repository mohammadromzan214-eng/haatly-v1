import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { listActiveCoupons } from "@/lib/catalog";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ coupon?: string }> }) {
  const [{ coupon = "" }, coupons] = await Promise.all([searchParams, listActiveCoupons()]);
  return (
    <main className="mx-auto max-w-7xl px-5 pb-10">
      <CheckoutForm coupons={coupons} initialCoupon={coupon} />
    </main>
  );
}
