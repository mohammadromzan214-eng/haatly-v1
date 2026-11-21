import type { Metadata } from "next";
import { CheckoutSuccess } from "@/components/CheckoutSuccess";

export const metadata: Metadata = { title: "Order placed" };

export default function CheckoutSuccessPage() {
  return <CheckoutSuccess />;
}
