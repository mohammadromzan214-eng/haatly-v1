import type { Order, OrderAddress, OrderDetails, OrderStatus, PaymentStatus } from "@/lib/types";
import { getDb } from "./client";

interface OrderRow {
  code: string;
  phone: string;
  status: string;
  placed_at: Date | string;
  delivery_fee: string | number;
  discount: string | number;
  payment_method: string;
  payment_status: PaymentStatus;
  courier: string;
  ship_to: Order["shipTo"];
}

interface OrderDetailRow extends OrderRow {
  customer_name: string;
  customer_email: string | null;
  delivery_address: unknown;
  billing_address: unknown;
  billing_same_as_delivery: boolean;
  notes: string;
  subtotal: string | number;
  total: string | number;
  coupon_code: string | null;
  payment_reference: string | null;
}

interface PaymentDetailRow {
  provider: string;
  status: PaymentStatus;
  amount: string | number;
  currency: string;
  transaction_reference: string | null;
  verification_status: string;
  verified_at: Date | string | null;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function addressSnapshot(value: unknown, shipTo: Order["shipTo"], phone: string): OrderAddress {
  const address = objectValue(value);
  return {
    name: stringValue(address.name, shipTo.name),
    phone: stringValue(address.phone, phone),
    district: stringValue(address.district, stringValue(address.city, shipTo.city)),
    area: stringValue(address.area, shipTo.area),
    address: stringValue(address.address, stringValue(address.details, "")),
  };
}

async function hydrateOrders(rows: OrderRow[]): Promise<Order[]> {
  const sql = getDb();
  return Promise.all(rows.map(async (row) => {
    const [lines, events] = await Promise.all([
      sql`SELECT product_id,title,image,quantity,unit_price,seller_id FROM order_items WHERE order_code=${row.code} ORDER BY id`,
      sql`SELECT status,occurred_at,note FROM order_events WHERE order_code=${row.code} ORDER BY occurred_at`,
    ]);
    return {
      code: row.code,
      phone: row.phone,
      status: row.status as OrderStatus,
      placedAt: new Date(row.placed_at).toISOString(),
      lines: lines.map((line) => ({
        productId: line.product_id ?? "",
        sellerId: line.seller_id,
        title: line.title,
        image: line.image,
        qty: line.quantity,
        unitPrice: Number(line.unit_price),
      })),
      deliveryFee: Number(row.delivery_fee),
      discount: Number(row.discount),
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      courier: row.courier,
      shipTo: row.ship_to,
      timeline: events.map((event) => ({
        status: event.status as OrderStatus,
        at: new Date(event.occurred_at).toISOString(),
        note: event.note,
      })),
    };
  }));
}

export async function listCustomerOrders(userId: string) {
  const sql = getDb();
  const rows = await sql<OrderRow[]>`SELECT code,phone,status,placed_at,delivery_fee,discount,payment_method,payment_status,courier,ship_to FROM orders WHERE user_id=${userId} ORDER BY placed_at DESC`;
  return hydrateOrders(rows);
}

export async function getCustomerOrder(userId: string, code: string) {
  const sql = getDb();
  const [row] = await sql<OrderRow[]>`SELECT code,phone,status,placed_at,delivery_fee,discount,payment_method,payment_status,courier,ship_to FROM orders WHERE user_id=${userId} AND code=${code}`;
  if (!row) return null;
  return (await hydrateOrders([row]))[0];
}

export async function getCustomerOrderDetails(userId: string, code: string): Promise<OrderDetails | null> {
  const sql = getDb();
  const [row] = await sql<OrderDetailRow[]>`
    SELECT code,phone,status,placed_at,delivery_fee,discount,payment_method,payment_status,courier,ship_to,
      customer_name,customer_email,delivery_address,billing_address,billing_same_as_delivery,
      notes,subtotal,total,coupon_code,payment_reference
    FROM orders
    WHERE user_id=${userId} AND code=${code}
    LIMIT 1
  `;
  if (!row) return null;

  const [lines, events, payments] = await Promise.all([
    sql`
      SELECT oi.product_id,oi.title,oi.image,oi.quantity,oi.unit_price,oi.seller_id,s.name AS seller_name
      FROM order_items oi
      JOIN sellers s ON s.id=oi.seller_id
      WHERE oi.order_code=${row.code}
      ORDER BY oi.id
    `,
    sql`
      SELECT status,occurred_at,note
      FROM order_events
      WHERE order_code=${row.code}
      ORDER BY occurred_at,id
    `,
    sql<PaymentDetailRow[]>`
      SELECT provider,status,amount,currency,transaction_reference,verification_status,verified_at
      FROM payments
      WHERE order_code=${row.code}
      ORDER BY created_at DESC
      LIMIT 1
    `,
  ]);
  const [payment] = payments;
  const subtotalFromLines = lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unit_price),
    0,
  );
  const subtotal = Number(row.subtotal) || subtotalFromLines;
  const deliveryFee = Number(row.delivery_fee);
  const discount = Number(row.discount);
  const total = Number(row.total) || subtotal + deliveryFee - discount;
  const paymentStatus = payment?.status ?? row.payment_status;
  const deliveryAddress = addressSnapshot(row.delivery_address, row.ship_to, row.phone);

  return {
    code: row.code,
    phone: row.phone,
    status: row.status as OrderStatus,
    placedAt: new Date(row.placed_at).toISOString(),
    lines: lines.map((line) => ({
      productId: line.product_id ?? "",
      sellerId: line.seller_id,
      sellerName: line.seller_name,
      title: line.title,
      image: line.image,
      qty: line.quantity,
      unitPrice: Number(line.unit_price),
    })),
    deliveryFee,
    discount,
    paymentMethod: row.payment_method,
    paymentStatus,
    courier: row.courier,
    shipTo: row.ship_to,
    timeline: events.map((event) => ({
      status: event.status as OrderStatus,
      at: new Date(event.occurred_at).toISOString(),
      note: event.note,
    })),
    customerName: row.customer_name || deliveryAddress.name,
    customerEmail: row.customer_email,
    deliveryAddress,
    billingAddress: addressSnapshot(row.billing_address, row.ship_to, row.phone),
    billingSameAsDelivery: row.billing_same_as_delivery,
    notes: row.notes,
    subtotal,
    total,
    couponCode: row.coupon_code,
    payment: {
      provider: payment?.provider ?? row.payment_method,
      status: paymentStatus,
      amount: payment ? Number(payment.amount) : total,
      currency: payment?.currency ?? "BDT",
      reference: payment?.transaction_reference ?? row.payment_reference,
      verificationStatus: payment?.verification_status ?? "unverified",
      verifiedAt: payment?.verified_at ? new Date(payment.verified_at).toISOString() : null,
    },
  };
}

export async function findPublicOrder(code: string, phone: string) {
  const normalisedCode = code.replace(/[^0-9a-z]/gi, "").toLowerCase();
  const normalisedPhone = phone.replace(/\D/g, "");
  if (!normalisedCode || normalisedPhone.length < 6) return null;
  const sql = getDb();
  const [row] = await sql<OrderRow[]>`
    SELECT code,phone,status,placed_at,delivery_fee,discount,payment_method,payment_status,courier,ship_to
    FROM orders
    WHERE lower(regexp_replace(code, '[^0-9a-z]', '', 'g'))=${normalisedCode}
      AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 6)=${normalisedPhone.slice(-6)}
    LIMIT 1
  `;
  if (!row) return null;
  return (await hydrateOrders([row]))[0];
}
