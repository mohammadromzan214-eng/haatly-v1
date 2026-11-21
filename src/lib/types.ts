/**
 * Domain types for Haatly.
 *
 * These mirror the planned database tables (see PLAN.md, milestone 2). They are deliberately
 * marketplace-shaped from day one: every product and order line belongs to a `Seller`, and the
 * store itself is simply the first seller (kind "platform"). Partner shops are sellers of kind
 * "partner"; future third-party vendors become sellers of kind "marketplace" — no restructuring.
 */

export type SourceType = "own_stock" | "partner_shop" | "pre_order";
export type ProductStatus = "active" | "draft" | "out_of_stock";
export type StockBadge = "in_stock" | "partner_shop" | "pre_order";

export type SellerKind = "platform" | "partner" | "marketplace";
export type PaymentMethod = "cod" | "bkash" | "nagad";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
};

export function paymentMethodLabel(method: string) {
  return method in PAYMENT_METHOD_LABEL
    ? PAYMENT_METHOD_LABEL[method as PaymentMethod]
    : method;
}

export interface Seller {
  id: string;
  slug: string;
  name: string;
  kind: SellerKind;
  area: string;
  city: string;
  /** Commission the platform keeps on each sale, in percent. 0 for the platform seller. */
  commissionRate: number;
  rating: number;
  /** Extra handling days before a parcel reaches the Haatly hub. */
  handoverDays: number;
}

export interface Category {
  slug: string;
  name: string;
  blurb: string;
  image: string;
  parentSlug?: string;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  title: string;
  shortDescription: string;
  description: string;
  categorySlug: string;
  sellerId: string;
  seller?: Pick<Seller, "id" | "slug" | "name" | "kind" | "area" | "city" | "rating" | "handoverDays">;
  sourceType: SourceType;
  status: ProductStatus;
  price: number;
  compareAtPrice?: number;
  stock: number;
  lowStockThreshold: number;
  /** Shown on pre-order items, e.g. "4 Dec". */
  preorderEta?: string;
  images: string[];
  paymentMethods?: PaymentMethod[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  highlights: string[];
  specs: Record<string, string>;
  tags: string[];
  createdAt: string;
}

export const ORDER_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
] as const;

export type OrderStatus = (typeof ORDER_FLOW)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  note: string;
}

export interface OrderLine {
  productId: string;
  sellerId: string;
  sellerName?: string;
  title: string;
  image: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  code: string;
  phone: string;
  status: OrderStatus;
  placedAt: string;
  lines: OrderLine[];
  deliveryFee: number;
  discount: number;
  paymentMethod: string;
  paymentStatus?: PaymentStatus;
  courier: string;
  shipTo: { name: string; area: string; city: string };
  timeline: OrderEvent[];
}

export interface OrderAddress {
  name: string;
  phone: string;
  district: string;
  area: string;
  address: string;
}

export interface OrderPaymentDetails {
  provider: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  reference: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
}

export interface OrderDetails extends Order {
  customerName: string;
  customerEmail: string | null;
  deliveryAddress: OrderAddress;
  billingAddress: OrderAddress;
  billingSameAsDelivery: boolean;
  notes: string;
  subtotal: number;
  total: number;
  couponCode: string | null;
  payment: OrderPaymentDetails;
}
