import "server-only";
import {
  ORDER_FLOW,
  ORDER_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/types";
import { getDb } from "./client";

export interface AdminOrder {
  code: string;
  status: OrderStatus;
  placedAt: string;
  customerName: string;
  customerEmail: string | null;
  phone: string;
  deliveryAddress: { district: string; area: string; address: string };
  notes: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
}

interface AdminOrderRow {
  code: string;
  status: string;
  placed_at: Date | string;
  customer_name: string;
  customer_email: string | null;
  phone: string;
  delivery_address: unknown;
  ship_to: unknown;
  notes: string;
  payment_method: string;
  payment_status: PaymentStatus;
  subtotal: string | number;
  delivery_fee: string | number;
  discount: string | number;
  total: string | number;
}

export class OrderTransitionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const sql = getDb();
  const rows = await sql<AdminOrderRow[]>`
    SELECT code,status,placed_at,customer_name,customer_email,phone,delivery_address,ship_to,notes,
      payment_method,payment_status,subtotal,delivery_fee,discount,total
    FROM orders
    ORDER BY placed_at DESC
    LIMIT 200
  `;
  if (!rows.length) return [];

  const codes = rows.map((row) => row.code);
  const itemRows = await sql`
    SELECT order_code,title,quantity,unit_price
    FROM order_items
    WHERE order_code IN ${sql(codes)}
    ORDER BY order_code,id
  `;
  const itemsByOrder = new Map<string, AdminOrder["items"]>();
  for (const item of itemRows) {
    const items = itemsByOrder.get(item.order_code) ?? [];
    items.push({ title: item.title, quantity: item.quantity, unitPrice: Number(item.unit_price) });
    itemsByOrder.set(item.order_code, items);
  }

  return rows.map((row) => {
    const address = objectValue(row.delivery_address);
    const fallback = objectValue(row.ship_to);
    return {
      code: row.code,
      status: row.status as OrderStatus,
      placedAt: new Date(row.placed_at).toISOString(),
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      phone: row.phone,
      deliveryAddress: {
        district: stringValue(address.district) || stringValue(address.city) || stringValue(fallback.city),
        area: stringValue(address.area) || stringValue(fallback.area),
        address: stringValue(address.address) || stringValue(address.details),
      },
      notes: row.notes,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      subtotal: Number(row.subtotal),
      deliveryFee: Number(row.delivery_fee),
      discount: Number(row.discount),
      total: Number(row.total),
      items: itemsByOrder.get(row.code) ?? [],
    };
  });
}

export async function updateAdminOrderStatus(input: {
  code: string;
  status: OrderStatus;
}) {
  const sql = getDb();
  return sql.begin(async (tx) => {
    const [order] = await tx`
      SELECT status FROM orders WHERE code=${input.code} FOR UPDATE
    `;
    if (!order) throw new OrderTransitionError("Order not found.", 404);

    const currentStatus = order.status as OrderStatus;
    const currentIndex = currentStatus === "cancelled" ? -1 : ORDER_FLOW.indexOf(currentStatus);
    const cancelling = input.status === "cancelled";
    const nextIndex = input.status === "cancelled" ? -1 : ORDER_FLOW.indexOf(input.status);
    if (currentStatus === "cancelled" || (cancelling && currentStatus === "delivered")) {
      throw new OrderTransitionError("This order can no longer be cancelled or changed.", 409);
    }
    if (cancelling ? currentIndex < 0 : currentIndex < 0 || nextIndex !== currentIndex + 1) {
      throw new OrderTransitionError("Orders can only move to the next status.", 409);
    }

    await tx`UPDATE orders SET status=${input.status} WHERE code=${input.code}`;
    await tx`UPDATE seller_orders SET status=${input.status} WHERE order_code=${input.code}`;
    if (cancelling) {
      await tx`
        UPDATE products AS product
        SET stock=product.stock+item.quantity,
          status=CASE WHEN product.status='out_of_stock' THEN 'active' ELSE product.status END,
          updated_at=now()
        FROM (
          SELECT product_id,SUM(quantity)::INTEGER AS quantity
          FROM order_items
          WHERE order_code=${input.code} AND product_id IS NOT NULL
          GROUP BY product_id
        ) AS item
        WHERE item.product_id=product.id
      `;
    }
    await tx`
      INSERT INTO order_events (order_code,status,occurred_at,note)
      VALUES (
        ${input.code},${input.status},now(),
        ${cancelling ? "Order cancelled. Reserved stock returned to inventory." : `Order ${ORDER_STATUS_LABEL[input.status].toLowerCase()}.`}
      )
    `;
    return { ok: true as const };
  });
}
