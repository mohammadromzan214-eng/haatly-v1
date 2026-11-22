import type { Category, PaymentMethod, Product, Seller, SellerKind, SourceType, ProductStatus } from "@/lib/types";
import type { AdminBanner, AdminCoupon, AdminSettings } from "@/components/admin/AdminDataProvider";
import { getDb } from "./client";

type ProductRow = {
  id: string; slug: string; sku: string; title: string; short_description: string; description: string;
  category_slug: string | null; seller_id: string; source_type: SourceType; status: ProductStatus;
  price: string | number; compare_at_price: string | number | null; stock: number; low_stock_threshold: number;
  preorder_eta: string | null; images: string[]; payment_methods: PaymentMethod[]; rating: string | number;
  review_count: number; sold_count: number; highlights: string[]; specs: Record<string, string>;
  tags: string[]; created_at: Date | string; seller_slug: string; seller_name: string; seller_kind: SellerKind;
  seller_area: string; seller_city: string; seller_rating: string | number;
  seller_handover_days: number;
};

function mapSeller(row: Pick<ProductRow, "seller_id" | "seller_slug" | "seller_name" | "seller_kind" | "seller_area" | "seller_city" | "seller_rating" | "seller_handover_days">): NonNullable<Product["seller"]> {
  return {
    id: row.seller_id,
    slug: row.seller_slug,
    name: row.seller_name,
    kind: row.seller_kind,
    area: row.seller_area,
    city: row.seller_city,
    rating: Number(row.seller_rating),
    handoverDays: row.seller_handover_days,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    categorySlug: row.category_slug ?? "",
    sellerId: row.seller_id,
    seller: mapSeller(row),
    sourceType: row.source_type,
    status: row.status,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? undefined : Number(row.compare_at_price),
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    preorderEta: row.preorder_eta ?? undefined,
    images: Array.isArray(row.images) ? row.images : [],
    paymentMethods: row.payment_methods,
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    soldCount: Number(row.sold_count ?? 0),
    highlights: row.highlights,
    specs: row.specs,
    tags: row.tags,
    createdAt: String(row.created_at).slice(0, 10),
  };
}

export async function listStorefrontProducts() {
  const sql = getDb();
  const rows = await sql<ProductRow[]>`
    SELECT p.*, s.slug AS seller_slug, s.name AS seller_name, s.kind AS seller_kind,
      s.area AS seller_area, s.city AS seller_city, s.rating AS seller_rating, s.handover_days AS seller_handover_days
    FROM products p JOIN sellers s ON s.id=p.seller_id
    WHERE p.status <> 'draft' AND s.active
    ORDER BY p.created_at DESC, p.title
  `;
  return rows.map(mapProduct);
}

export async function listProductsByCategory(categorySlug: string) {
  const sql = getDb();
  const rows = await sql<ProductRow[]>`
    SELECT p.*, s.slug AS seller_slug, s.name AS seller_name, s.kind AS seller_kind,
      s.area AS seller_area, s.city AS seller_city, s.rating AS seller_rating, s.handover_days AS seller_handover_days
    FROM products p JOIN sellers s ON s.id=p.seller_id
    WHERE p.status <> 'draft' AND s.active AND p.category_slug=${categorySlug}
    ORDER BY p.created_at DESC, p.title
  `;
  return rows.map(mapProduct);
}

export async function getStorefrontProductBySlug(slug: string) {
  const sql = getDb();
  const [row] = await sql<ProductRow[]>`
    SELECT p.*, s.slug AS seller_slug, s.name AS seller_name, s.kind AS seller_kind,
      s.area AS seller_area, s.city AS seller_city, s.rating AS seller_rating, s.handover_days AS seller_handover_days
    FROM products p JOIN sellers s ON s.id=p.seller_id
    WHERE p.slug=${slug} AND p.status <> 'draft' AND s.active
    LIMIT 1
  `;
  return row ? mapProduct(row) : undefined;
}

export async function getStorefrontProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const sql = getDb();
  const rows = await sql<ProductRow[]>`
    SELECT p.*, s.slug AS seller_slug, s.name AS seller_name, s.kind AS seller_kind,
      s.area AS seller_area, s.city AS seller_city, s.rating AS seller_rating, s.handover_days AS seller_handover_days
    FROM products p JOIN sellers s ON s.id=p.seller_id
    WHERE p.id IN ${sql(ids)} AND p.status <> 'draft' AND s.active
  `;
  const byId = new Map(rows.map((row) => [row.id, mapProduct(row)]));
  return ids.map((id) => byId.get(id)).filter((product): product is Product => product !== undefined);
}

export async function listCategories(): Promise<Category[]> {
  const rows = await getDb()`SELECT slug,name,blurb,image,parent_slug AS "parentSlug" FROM categories ORDER BY name`;
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    blurb: row.blurb,
    image: row.image,
    ...(row.parentSlug ? { parentSlug: row.parentSlug } : {}),
  }));
}

export async function getCategoryBySlug(slug: string) {
  const categories = await listCategories();
  return categories.find((category) => category.slug === slug);
}

export async function listSellers(): Promise<Seller[]> {
  const rows = await getDb()`SELECT id,slug,name,kind,area,city,commission_rate AS "commissionRate",rating,handover_days AS "handoverDays" FROM sellers WHERE active ORDER BY name`;
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    area: row.area,
    city: row.city,
    commissionRate: Number(row.commissionRate),
    rating: Number(row.rating),
    handoverDays: row.handoverDays,
  }));
}

export async function getSellersByIds(ids: string[]): Promise<Seller[]> {
  if (!ids.length) return [];
  const sql = getDb();
  const rows = await sql`SELECT id,slug,name,kind,area,city,commission_rate AS "commissionRate",rating,handover_days AS "handoverDays" FROM sellers WHERE id IN ${sql(ids)}`;
  return rows.map((row) => ({
    id: row.id, slug: row.slug, name: row.name, kind: row.kind, area: row.area, city: row.city,
    commissionRate: Number(row.commissionRate), rating: Number(row.rating), handoverDays: row.handoverDays,
  }));
}

export async function listActiveCoupons(): Promise<AdminCoupon[]> {
  const rows = await getDb()`SELECT id,code,label,percent_off AS "percentOff",max_discount AS "maxDiscount",expires_at AS "expiresAt",active FROM coupons WHERE active AND expires_at >= CURRENT_DATE ORDER BY code`;
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    percentOff: Number(row.percentOff),
    maxDiscount: Number(row.maxDiscount),
    expiresAt: String(row.expiresAt).slice(0, 10),
    active: row.active,
  }));
}

export async function listActiveBanners(): Promise<AdminBanner[]> {
  const rows = await getDb()`SELECT id,title,placement,image,active FROM banners WHERE active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()) ORDER BY sort_order,title`;
  return rows.map((row) => ({ id: row.id, title: row.title, placement: row.placement, image: row.image, active: row.active }));
}

export async function getBusinessSettings(): Promise<AdminSettings> {
  const [row] = await getDb()`SELECT value FROM business_settings WHERE key='store'`;
  const value = row?.value as Partial<AdminSettings> | undefined;
  return {
    storeName: value?.storeName ?? "Haatly",
    phone: value?.phone ?? "",
    whatsapp: value?.whatsapp ?? "",
    announcement: value?.announcement ?? "",
    bkashNumber: value?.bkashNumber ?? "",
    nagadNumber: value?.nagadNumber ?? "",
    email: value?.email ?? "",
    facebook: value?.facebook ?? "",
    instagram: value?.instagram ?? "",
    youtube: value?.youtube ?? "",
    address: value?.address ?? "",
  };
}

export async function getContentPage(slug: string) {
  const [page] = await getDb()`SELECT slug,title,body,published FROM content_pages WHERE slug=${slug} AND published`;
  return page ?? null;
}

export async function getRelatedStorefrontProducts(product: Product, limit = 4) {
  const pool = await listStorefrontProducts();
  const same = pool.filter((item) => item.categorySlug === product.categorySlug && item.id !== product.id);
  const rest = pool.filter((item) => item.categorySlug !== product.categorySlug && item.id !== product.id);
  return [...same, ...rest].slice(0, limit);
}

