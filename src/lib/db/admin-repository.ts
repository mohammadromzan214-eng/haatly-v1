import type { Category, Product } from "@/lib/types";
import { getDb } from "./client";
import type { AdminBanner, AdminContent, AdminContentKey, AdminCoupon, AdminProduct, AdminSeller, AdminSettings } from "@/components/admin/AdminDataProvider";

export interface AdminSnapshot {
  products: AdminProduct[];
  categories: Category[];
  sellers: AdminSeller[];
  coupons: AdminCoupon[];
  banners: AdminBanner[];
  settings: AdminSettings;
  content: AdminContent;
}

export class AdminSettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminSettingsValidationError";
  }
}

export async function readAdminSnapshot(): Promise<AdminSnapshot> {
  const sql = getDb();
  const productRows = await sql`SELECT * FROM products ORDER BY created_at DESC, title`;
  const categories = await sql`SELECT slug, name, blurb, image, parent_slug AS "parentSlug" FROM categories ORDER BY name`;
  const sellerRows = await sql`SELECT id,slug,name,kind,area,city,commission_rate AS "commissionRate",rating,handover_days AS "handoverDays",active FROM sellers ORDER BY name`;
  const couponRows = await sql`SELECT id, code, label, percent_off AS "percentOff", max_discount AS "maxDiscount", expires_at AS "expiresAt", active FROM coupons ORDER BY code`;
  const banners = await sql`SELECT id, title, placement, image, active FROM banners ORDER BY sort_order, title`;
  const settingRows = await sql`SELECT value FROM business_settings WHERE key = 'store'`;
  const contentRows = await sql`SELECT slug, body FROM content_pages`;
  const products: AdminProduct[] = productRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    categorySlug: row.category_slug ?? "",
    sellerId: row.seller_id,
    sourceType: row.source_type,
    status: row.status,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? undefined : Number(row.compare_at_price),
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    preorderEta: row.preorder_eta ?? undefined,
    images: row.images,
    paymentMethods: row.payment_methods as AdminProduct["paymentMethods"],
    rating: Number(row.rating),
    reviewCount: row.review_count,
    soldCount: row.sold_count,
    highlights: row.highlights,
    specs: row.specs,
    tags: row.tags,
    createdAt: String(row.created_at).slice(0, 10),
  }));
  const coupons: AdminCoupon[] = couponRows.map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    percentOff: Number(row.percentOff),
    maxDiscount: Number(row.maxDiscount),
    expiresAt: String(row.expiresAt).slice(0, 10),
    active: row.active,
  }));
  const content = Object.fromEntries(contentRows.map((row) => [row.slug, row.body])) as Partial<AdminContent>;
  const settingsValue = settingRows[0]?.value as Record<string, unknown> | undefined;

  return {
    products,
    sellers: sellerRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      area: row.area,
      city: row.city,
      commissionRate: Number(row.commissionRate),
      rating: Number(row.rating),
      handoverDays: row.handoverDays,
      active: row.active,
    })),
    categories: categories.map((row) => ({
      slug: row.slug,
      name: row.name,
      blurb: row.blurb,
      image: row.image,
      ...(row.parentSlug ? { parentSlug: row.parentSlug } : {}),
    })),
    coupons,
    banners: banners.map((row) => ({
      id: row.id,
      title: row.title,
      placement: row.placement,
      image: row.image,
      active: row.active,
    })),
    settings: {
      storeName: typeof settingsValue?.storeName === "string" ? settingsValue.storeName : "TOQAEE",
      phone: typeof settingsValue?.phone === "string" ? settingsValue.phone : "",
      whatsapp: typeof settingsValue?.whatsapp === "string" ? settingsValue.whatsapp : "",
      announcement: typeof settingsValue?.announcement === "string" ? settingsValue.announcement : "",
      bkashNumber: typeof settingsValue?.bkashNumber === "string" ? settingsValue.bkashNumber : "",
      nagadNumber: typeof settingsValue?.nagadNumber === "string" ? settingsValue.nagadNumber : "",
      email: typeof settingsValue?.email === "string" ? settingsValue.email : "",
      facebook: typeof settingsValue?.facebook === "string" ? settingsValue.facebook : "",
      instagram: typeof settingsValue?.instagram === "string" ? settingsValue.instagram : "",
      youtube: typeof settingsValue?.youtube === "string" ? settingsValue.youtube : "",
      address: typeof settingsValue?.address === "string" ? settingsValue.address : "",
    },
    content: {
      about: content.about ?? "",
      contact: content.contact ?? "",
      faq: content.faq ?? "",
      privacy: content.privacy ?? "",
      returns: content.returns ?? "",
      terms: content.terms ?? "",
    },
  };
}

export async function writeAdminMutation(input: {
  entity: string;
  operation: "upsert" | "delete";
  data: Record<string, unknown>;
}) {
  const sql = getDb();
  const { entity, operation, data } = input;

  if (entity === "product") {
    if (operation === "delete") return sql`DELETE FROM products WHERE id = ${String(data.id)}`;
    if (!Array.isArray(data.paymentMethods)
        || data.paymentMethods.some((method) => method !== "cod" && method !== "bkash" && method !== "nagad")) {
      throw new Error("Products can only enable COD, bKash, or Nagad.");
    }
    const p = data as unknown as AdminProduct;
    return sql`
      INSERT INTO products (id, slug, sku, title, short_description, description, category_slug, seller_id, source_type, status, price, compare_at_price, stock, low_stock_threshold, preorder_eta, images, payment_methods, rating, review_count, sold_count, highlights, specs, tags, created_at)
      VALUES (${p.id}, ${p.slug}, ${p.sku}, ${p.title}, ${p.shortDescription}, ${p.description}, ${p.categorySlug}, ${p.sellerId}, ${p.sourceType}, ${p.status}, ${p.price}, ${p.compareAtPrice ?? null}, ${p.stock}, ${p.lowStockThreshold}, ${p.preorderEta ?? null}, ${sql.json(p.images)}, ${sql.json(p.paymentMethods)}, ${p.rating}, ${p.reviewCount}, ${p.soldCount}, ${sql.json(p.highlights)}, ${sql.json(p.specs)}, ${sql.json(p.tags)}, ${p.createdAt})
      ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug, sku=EXCLUDED.sku, title=EXCLUDED.title, short_description=EXCLUDED.short_description, description=EXCLUDED.description, category_slug=EXCLUDED.category_slug, seller_id=EXCLUDED.seller_id, source_type=EXCLUDED.source_type, status=EXCLUDED.status, price=EXCLUDED.price, compare_at_price=EXCLUDED.compare_at_price, stock=EXCLUDED.stock, low_stock_threshold=EXCLUDED.low_stock_threshold, preorder_eta=EXCLUDED.preorder_eta, images=EXCLUDED.images, payment_methods=EXCLUDED.payment_methods, rating=EXCLUDED.rating, review_count=EXCLUDED.review_count, sold_count=EXCLUDED.sold_count, highlights=EXCLUDED.highlights, specs=EXCLUDED.specs, tags=EXCLUDED.tags, updated_at=now()
    `;
  }

  if (entity === "category") {
    if (operation === "delete") {
      const fallbackSlug = String(data.fallbackSlug ?? "");
      return sql.begin(async (tx) => {
        await tx`UPDATE products SET category_slug=${fallbackSlug || null} WHERE category_slug=${String(data.slug)}`;
        await tx`DELETE FROM categories WHERE slug=${String(data.slug)}`;
      });
    }
    const c = data as unknown as Category;
    return sql`INSERT INTO categories (slug,name,blurb,image,parent_slug) VALUES (${c.slug},${c.name},${c.blurb},${c.image},${c.parentSlug ?? null}) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,blurb=EXCLUDED.blurb,image=EXCLUDED.image,parent_slug=EXCLUDED.parent_slug,updated_at=now()`;
  }

  if (entity === "coupon") {
    if (operation === "delete") return sql`DELETE FROM coupons WHERE id=${String(data.id)}`;
    const c = data as unknown as AdminCoupon;
    return sql`INSERT INTO coupons (id,code,label,percent_off,max_discount,expires_at,active) VALUES (${c.id},${c.code},${c.label},${c.percentOff},${c.maxDiscount},${c.expiresAt},${c.active}) ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,label=EXCLUDED.label,percent_off=EXCLUDED.percent_off,max_discount=EXCLUDED.max_discount,expires_at=EXCLUDED.expires_at,active=EXCLUDED.active`;
  }

  if (entity === "banner") {
    if (operation === "delete") return sql`DELETE FROM banners WHERE id=${String(data.id)}`;
    const b = data as unknown as AdminBanner;
    return sql`INSERT INTO banners (id,title,placement,image,active) VALUES (${b.id},${b.title},${b.placement},${b.image},${b.active}) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,placement=EXCLUDED.placement,image=EXCLUDED.image,active=EXCLUDED.active`;
  }

  if (entity === "settings") {
    const announcement = typeof data.announcement === "string" ? data.announcement : "";
    const bkashNumber = typeof data.bkashNumber === "string" ? data.bkashNumber.trim() : "";
    const nagadNumber = typeof data.nagadNumber === "string" ? data.nagadNumber.trim() : "";
    if (announcement.length > 240) throw new AdminSettingsValidationError("Storefront notice must be 240 characters or fewer.");
    for (const [label, number] of [["bKash", bkashNumber], ["Nagad", nagadNumber]] as const) {
      const normalized = number.replace(/[\s-]/g, "");
      if (normalized && !/^(?:\+?880|0)1[3-9]\d{8}$/.test(normalized)) {
        throw new AdminSettingsValidationError(`Enter a valid Bangladesh mobile number for ${label}.`);
      }
    }
    return sql`INSERT INTO business_settings (key,value) VALUES ('store',${sql.json(data)}) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()`;
  }

  if (entity === "content") {
    const slug = String(data.slug) as AdminContentKey;
    const title = String(data.title);
    const body = String(data.body);
    return sql`INSERT INTO content_pages (slug,title,body,published) VALUES (${slug},${title},${body},true) ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,published=true,updated_at=now()`;
  }

  throw new Error(`Unsupported admin data entity: ${entity}`);
}

export type { Product };
