import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { listActiveCoupons } from "@/lib/catalog";

export const metadata: Metadata = { title: "Your bag" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const coupons = await listActiveCoupons();
  return (
    <main className="mx-auto max-w-7xl px-5">
      <CartView coupons={coupons} />
    </main>
  );
}
