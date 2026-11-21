import { createHash, randomBytes } from "node:crypto";
import type { CustomerSession } from "@/lib/customer-auth";
import { site } from "@/lib/site";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/types";
import { getDb } from "./client";

export interface CheckoutAddress {
  name: string;
  phone: string;
  district: string;
  area: string;
  address: string;
}

export interface CreateOrderInput {
  customerEmail: string | null;
  deliveryAddress: CheckoutAddress;
  billingAddress: CheckoutAddress;
  billingSameAsDelivery: boolean;
  notes: string;
  items: Array<{ productId: string; quantity: number }>;
  couponCode: string | null;
  paymentMethod: PaymentMethod;
}

interface CheckoutProductRow {
  id: string;
  title: string;
  price: string | number;
  stock: number;
  status: string;
  images: string[];
  payment_methods: PaymentMethod[];
  seller_id: string;
  commission_rate: string | number;
  handover_days: number;
}

export class CheckoutError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "CheckoutError";
  }
}

function hashReceiptToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function orderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `HTL-${date}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export async function createCheckoutOrder(input: CreateOrderInput, session: CustomerSession | null) {
  const code = orderNumber();
  const receiptToken = randomBytes(32).toString("base64url");
  const paymentId = `pay_${randomBytes(12).toString("hex")}`;
  const receiptTokenHash = hashReceiptToken(receiptToken);
  const receiptExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const deliveryAddressJson = {
    ...input.deliveryAddress,
    city: input.deliveryAddress.district,
    details: input.deliveryAddress.address,
  };
  const billingAddressJson = {
    ...input.billingAddress,
    city: input.billingAddress.district,
    details: input.billingAddress.address,
  };
  const insideDhaka = input.deliveryAddress.district.trim().toLowerCase() === "dhaka";

  const created = await getDb().begin(async (tx) => {
    let customer: { id: string; email: string } | null = null;
    if (session) {
      const [row] = await tx`SELECT id,email FROM users WHERE id=${session.id} AND role='customer'`;
      if (row) customer = { id: row.id, email: row.email };
    }
    if (input.paymentMethod !== "cod" && !customer) {
      throw new CheckoutError("Sign in to use online payment. Guest checkout remains available with Cash on Delivery.", 401);
    }

    const quantities = new Map<string, number>();
    for (const item of input.items) {
      const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
      if (quantity > 10) throw new CheckoutError("A maximum of 10 units per product can be ordered.", 400);
      quantities.set(item.productId, quantity);
    }
    const productIds = [...quantities.keys()];
    const rows = await tx<CheckoutProductRow[]>`
      SELECT p.id,p.title,p.price,p.stock,p.status,p.images,p.payment_methods,
        p.seller_id,s.name AS seller_name,s.commission_rate,s.handover_days
      FROM products p
      JOIN sellers s ON s.id=p.seller_id
      WHERE p.id IN ${tx(productIds)}
      FOR UPDATE OF p
    `;
    if (rows.length !== productIds.length) throw new CheckoutError("One or more products are no longer available.", 409);

    const productById = new Map(rows.map((row) => [row.id as string, row]));
    const selected = productIds.map((id) => {
      const product = productById.get(id);
      if (!product || product.status !== "active" || product.stock < quantities.get(id)!) {
        throw new CheckoutError(`${product?.title ?? "A product"} is unavailable or has insufficient stock. Please review your bag.`, 409);
      }
      if (!Array.isArray(product.payment_methods) || !product.payment_methods.includes(input.paymentMethod)) {
        throw new CheckoutError(`${product.title} does not accept ${PAYMENT_METHOD_LABEL[input.paymentMethod]}.`, 400);
      }
      return { ...product, quantity: quantities.get(id)!, unitPrice: Number(product.price) };
    });

    const subtotal = selected.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    let couponCode: string | null = null;
    let discount = 0;
    if (input.couponCode) {
      const [coupon] = await tx`
        SELECT code,percent_off,max_discount
        FROM coupons
        WHERE upper(code)=${input.couponCode.toUpperCase()} AND active AND expires_at >= CURRENT_DATE
        LIMIT 1
      `;
      if (!coupon) throw new CheckoutError("That coupon is no longer valid.", 400);
      couponCode = coupon.code;
      discount = Math.min(Math.round((subtotal * Number(coupon.percent_off)) / 100), Number(coupon.max_discount));
    }

    const deliveryFee = subtotal - discount >= site.delivery.freeOver
      ? 0
      : insideDhaka ? site.delivery.insideDhaka : site.delivery.outsideDhaka;
    const total = subtotal - discount + deliveryFee;
    const orderPhone = input.deliveryAddress.phone.trim();
    const shipTo = {
      name: input.deliveryAddress.name,
      area: input.deliveryAddress.area,
      city: input.deliveryAddress.district,
    };

    await tx`
      INSERT INTO orders (
        code,user_id,phone,status,placed_at,delivery_fee,discount,payment_method,courier,ship_to,
        customer_name,customer_email,delivery_address,billing_address,billing_same_as_delivery,
        notes,subtotal,total,coupon_code,receipt_token_hash,receipt_expires_at,payment_status
      ) VALUES (
        ${code},${customer?.id ?? null},${orderPhone},'pending',now(),${deliveryFee},${discount},
        ${input.paymentMethod},'Haatly Delivery',${tx.json(shipTo)},${input.deliveryAddress.name},
        ${customer?.email ?? input.customerEmail},${tx.json(deliveryAddressJson)},${tx.json(billingAddressJson)},
        ${input.billingSameAsDelivery},${input.notes},${subtotal},${total},${couponCode},
        ${receiptTokenHash},${receiptExpiresAt},'pending'
      )
    `;
    await tx`
      INSERT INTO payments (id,order_code,provider,status,amount,currency)
      VALUES (${paymentId},${code},${input.paymentMethod},'pending',${total},'BDT')
    `;

    const sellerTotals = new Map<string, { subtotal: number; commissionRate: number }>();
    for (const item of selected) {
      await tx`
        INSERT INTO order_items (order_code,seller_id,product_id,title,image,quantity,unit_price)
        VALUES (${code},${item.seller_id},${item.id},${item.title},${item.images[0] ?? ""},${item.quantity},${item.unitPrice})
      `;
      const sellerTotal = sellerTotals.get(item.seller_id) ?? {
        subtotal: 0,
        commissionRate: Number(item.commission_rate),
      };
      sellerTotal.subtotal += item.unitPrice * item.quantity;
      sellerTotals.set(item.seller_id, sellerTotal);
      const remainingStock = Number(item.stock) - item.quantity;
      await tx`
        UPDATE products
        SET stock=${remainingStock},
          status=CASE WHEN ${remainingStock}=0 THEN 'out_of_stock' ELSE status END,
          updated_at=now()
        WHERE id=${item.id}
      `;
    }

    for (const [sellerId, values] of sellerTotals) {
      await tx`
        INSERT INTO seller_orders (id,order_code,seller_id,status,subtotal,commission_rate)
        VALUES (${`${code}_${sellerId}`},${code},${sellerId},'pending',${values.subtotal},${values.commissionRate})
      `;
    }

    await tx`
      INSERT INTO order_events (order_code,status,occurred_at,note)
      VALUES (${code},'pending',now(),${`Order placed via ${PAYMENT_METHOD_LABEL[input.paymentMethod]}.`})
    `;

    const handoverDays = Math.max(...selected.map((item) => Number(item.handover_days)));
    return {
      code,
      paymentId,
      paymentMethod: input.paymentMethod,
      total,
      estimatedDelivery: `${1 + handoverDays}–${3 + handoverDays} days`,
    };
  });

  return { ...created, receiptToken };
}

export async function getCheckoutReceipt(token: string) {
  const tokenHash = hashReceiptToken(token);
  const sql = getDb();
  const [order] = await sql`
    SELECT code,phone,status,placed_at,payment_method,payment_status,payment_reference,courier,customer_name,customer_email,
      delivery_address,billing_address,billing_same_as_delivery,notes,subtotal,delivery_fee,
      discount,total,coupon_code
    FROM orders
    WHERE receipt_token_hash=${tokenHash} AND receipt_expires_at > now()
  `;
  if (!order) return null;

  const items = await sql`
    SELECT oi.product_id,oi.title,oi.image,oi.quantity,oi.unit_price,oi.seller_id,
      s.name AS seller_name,s.handover_days
    FROM order_items oi JOIN sellers s ON s.id=oi.seller_id
    WHERE oi.order_code=${order.code}
    ORDER BY oi.id
  `;
  const [payment] = await sql`
    SELECT provider_data FROM payments WHERE order_code=${order.code}
    ORDER BY created_at DESC LIMIT 1
  `;
  const handoverDays = Math.max(0, ...items.map((item) => Number(item.handover_days)));
  const providerData = payment?.provider_data as { message?: string } | undefined;
  return {
    code: order.code as string,
    phone: order.phone as string,
    customerName: order.customer_name as string,
    customerEmail: order.customer_email as string | null,
    status: order.status as string,
    placedAt: new Date(order.placed_at).toISOString(),
    paymentMethod: order.payment_method as string,
    paymentStatus: order.payment_status as string,
    paymentReference: order.payment_reference as string | null,
    paymentMessage: providerData?.message
      ?? (order.payment_method === "cod" ? "Pay with Cash on Delivery when your order arrives." : ""),
    courier: order.courier as string,
    deliveryAddress: order.delivery_address,
    billingAddress: order.billing_address,
    billingSameAsDelivery: order.billing_same_as_delivery as boolean,
    notes: order.notes as string,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.delivery_fee),
    discount: Number(order.discount),
    total: Number(order.total),
    couponCode: order.coupon_code as string | null,
    estimatedDelivery: `${1 + handoverDays}–${3 + handoverDays} days`,
    items: items.map((item) => ({
      productId: item.product_id as string,
      title: item.title as string,
      image: item.image as string,
      quantity: item.quantity as number,
      unitPrice: Number(item.unit_price),
      sellerName: item.seller_name as string,
    })),
  };
}

export async function claimCheckoutReceipt(userId: string, token: string) {
  const tokenHash = hashReceiptToken(token);
  const [claimed] = await getDb()`
    UPDATE orders AS order_row
    SET user_id=${userId}
    FROM users AS customer
    WHERE order_row.receipt_token_hash=${tokenHash}
      AND order_row.receipt_expires_at > now()
      AND customer.id=${userId}
      AND customer.role='customer'
      AND (
        order_row.user_id=customer.id
        OR (
          order_row.user_id IS NULL
          AND right(regexp_replace(order_row.phone,'[^0-9]','','g'),10)
            = right(regexp_replace(customer.phone,'[^0-9]','','g'),10)
        )
      )
    RETURNING order_row.code
  `;
  return Boolean(claimed);
}
