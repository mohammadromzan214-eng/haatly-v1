import { randomBytes } from "node:crypto";
import { getDb } from "./client";

export interface AdminPartnerShop {
  id: string;
  slug: string;
  name: string;
  area: string;
  city: string;
  commissionRate: number;
  handoverDays: number;
  active: boolean;
  productCount: number;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
  orderCount: number;
  lastOrderAt: string | null;
  orderValue: number;
}

export interface AdminCustomerOrder {
  code: string;
  placedAt: string;
  status: string;
  paymentStatus: string;
  total: number;
}

export interface AdminDashboardData {
  totalOrders: number;
  openOrders: number;
  paidSales: number;
  activeProducts: number;
  activeCustomers: number;
  activePartnerShops: number;
  lowStockCount: number;
  recentOrders: Array<{
    code: string;
    customerName: string;
    placedAt: string;
    status: string;
    paymentStatus: string;
    total: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    title: string;
    sku: string;
    stock: number;
    lowStockThreshold: number;
  }>;
}

export async function readAdminDashboard(): Promise<AdminDashboardData> {
  const sql = getDb();
  const [summary] = await sql`
    SELECT
      (SELECT count(*)::int FROM orders) AS "totalOrders",
      (SELECT count(*)::int FROM orders WHERE status NOT IN ('delivered','cancelled')) AS "openOrders",
      (SELECT COALESCE(sum(total),0) FROM orders WHERE payment_status='paid') AS "paidSales",
      (SELECT count(*)::int FROM products p JOIN sellers s ON s.id=p.seller_id WHERE p.status='active' AND s.active) AS "activeProducts",
      (SELECT count(*)::int FROM users WHERE role='customer' AND is_active) AS "activeCustomers",
      (SELECT count(*)::int FROM sellers WHERE kind='partner' AND active) AS "activePartnerShops",
      (SELECT count(*)::int FROM products p JOIN sellers s ON s.id=p.seller_id WHERE p.status <> 'draft' AND p.stock <= p.low_stock_threshold AND s.active) AS "lowStockCount"
  `;
  const recentOrders = await sql`
    SELECT code,customer_name AS "customerName",placed_at AS "placedAt",status,
      payment_status AS "paymentStatus",total
    FROM orders ORDER BY placed_at DESC LIMIT 8
  `;
  const lowStockProducts = await sql`
    SELECT p.id,p.title,p.sku,p.stock,p.low_stock_threshold AS "lowStockThreshold"
    FROM products p JOIN sellers s ON s.id=p.seller_id
    WHERE p.status <> 'draft' AND p.stock <= p.low_stock_threshold AND s.active
    ORDER BY p.stock ASC,p.title
    LIMIT 8
  `;

  return {
    totalOrders: Number(summary.totalOrders),
    openOrders: Number(summary.openOrders),
    paidSales: Number(summary.paidSales),
    activeProducts: Number(summary.activeProducts),
    activeCustomers: Number(summary.activeCustomers),
    activePartnerShops: Number(summary.activePartnerShops),
    lowStockCount: Number(summary.lowStockCount),
    recentOrders: recentOrders.map((row) => ({
      code: row.code as string,
      customerName: row.customerName as string,
      placedAt: String(row.placedAt),
      status: row.status as string,
      paymentStatus: row.paymentStatus as string,
      total: Number(row.total),
    })),
    lowStockProducts: lowStockProducts.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      sku: row.sku as string,
      stock: Number(row.stock),
      lowStockThreshold: Number(row.lowStockThreshold),
    })),
  };
}

export async function listAdminPartnerShops(): Promise<AdminPartnerShop[]> {
  const rows = await getDb()`
    SELECT s.id,s.slug,s.name,s.area,s.city,s.commission_rate AS "commissionRate",
      s.handover_days AS "handoverDays",s.active,
      count(p.id)::int AS "productCount"
    FROM sellers s
    LEFT JOIN products p ON p.seller_id=s.id
    WHERE s.kind='partner'
    GROUP BY s.id
    ORDER BY s.active DESC,s.name
  `;
  return rows.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    area: row.area as string,
    city: row.city as string,
    commissionRate: Number(row.commissionRate),
    handoverDays: Number(row.handoverDays),
    active: row.active as boolean,
    productCount: Number(row.productCount),
  }));
}

export async function createAdminPartnerShop(input: Omit<AdminPartnerShop, "id" | "active" | "productCount">) {
  const id = `sel_${randomBytes(12).toString("hex")}`;
  const [row] = await getDb()`
    INSERT INTO sellers (id,slug,name,kind,area,city,commission_rate,handover_days)
    VALUES (${id},${input.slug},${input.name},'partner',${input.area},${input.city},${input.commissionRate},${input.handoverDays})
    RETURNING id,slug,name,area,city,commission_rate AS "commissionRate",
      handover_days AS "handoverDays",active
  `;
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    area: row.area as string,
    city: row.city as string,
    commissionRate: Number(row.commissionRate),
    handoverDays: Number(row.handoverDays),
    active: row.active as boolean,
    productCount: 0,
  };
}

export async function updateAdminPartnerShop(input: {
  id: string;
  slug: string;
  name: string;
  area: string;
  city: string;
  commissionRate: number;
  handoverDays: number;
  active: boolean;
}) {
  const [row] = await getDb()`
    UPDATE sellers
    SET slug=${input.slug},name=${input.name},area=${input.area},city=${input.city},
      commission_rate=${input.commissionRate},handover_days=${input.handoverDays},
      active=${input.active},updated_at=now()
    WHERE id=${input.id} AND kind='partner'
    RETURNING id,slug,name,area,city,commission_rate AS "commissionRate",
      handover_days AS "handoverDays",active
  `;
  if (!row) return null;
  const [count] = await getDb()`SELECT count(*)::int AS value FROM products WHERE seller_id=${input.id}`;
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    area: row.area as string,
    city: row.city as string,
    commissionRate: Number(row.commissionRate),
    handoverDays: Number(row.handoverDays),
    active: row.active as boolean,
    productCount: Number(count.value),
  };
}

export async function listAdminCustomers(search: string): Promise<AdminCustomer[]> {
  const normalizedSearch = search.trim().toLowerCase();
  const rows = await getDb()`
    SELECT u.id,u.name,u.email,u.phone,u.is_active AS active,u.created_at AS "createdAt",
      count(o.code)::int AS "orderCount",max(o.placed_at) AS "lastOrderAt",
      COALESCE(sum(o.total) FILTER (WHERE o.status <> 'cancelled'),0) AS "orderValue"
    FROM users u
    LEFT JOIN orders o ON o.user_id=u.id
    WHERE u.role='customer'
      AND (${normalizedSearch}='' OR position(${normalizedSearch} in lower(u.name)) > 0
        OR position(${normalizedSearch} in lower(u.email)) > 0 OR position(${normalizedSearch} in lower(u.phone)) > 0)
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT 100
  `;
  return rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    active: row.active as boolean,
    createdAt: String(row.createdAt),
    orderCount: Number(row.orderCount),
    lastOrderAt: row.lastOrderAt ? String(row.lastOrderAt) : null,
    orderValue: Number(row.orderValue),
  }));
}

export async function getAdminCustomerDetails(id: string) {
  const [row] = await getDb()`
    SELECT id,name,email,phone,is_active AS active,created_at AS "createdAt"
    FROM users WHERE id=${id} AND role='customer'
  `;
  if (!row) return null;
  const orders = await getDb()`
    SELECT code,placed_at AS "placedAt",status,payment_status AS "paymentStatus",total
    FROM orders WHERE user_id=${id} ORDER BY placed_at DESC LIMIT 50
  `;
  return {
    customer: {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      phone: row.phone as string,
      active: row.active as boolean,
      createdAt: String(row.createdAt),
    },
    orders: orders.map((order) => ({
      code: order.code as string,
      placedAt: String(order.placedAt),
      status: order.status as string,
      paymentStatus: order.paymentStatus as string,
      total: Number(order.total),
    })),
  };
}

export async function updateAdminCustomer(input: {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
}) {
  const [row] = await getDb()`
    UPDATE users
    SET name=${input.name},email=${input.email.toLowerCase()},phone=${input.phone},
      session_version=session_version + CASE WHEN is_active IS DISTINCT FROM ${input.active} THEN 1 ELSE 0 END,
      is_active=${input.active},updated_at=now()
    WHERE id=${input.id} AND role='customer'
    RETURNING id,name,email,phone,is_active AS active,created_at AS "createdAt"
  `;
  return row ? {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: row.phone as string,
    active: row.active as boolean,
    createdAt: String(row.createdAt),
  } : null;
}
