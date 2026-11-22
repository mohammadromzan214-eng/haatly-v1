import { loadEnvConfig } from "@next/env";
import postgres from "postgres";
import { categories, coupons, orders, products, sellers } from "../src/lib/fixtures";

async function main() {
  loadEnvConfig(process.cwd());

  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before running seeds.");
  const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: process.env.NODE_ENV === "production" ? "require" : undefined });

  try {
    await sql.begin(async (tx) => {
      for (const seller of sellers) {
        await tx`INSERT INTO sellers (id,slug,name,kind,area,city,commission_rate,rating,handover_days) VALUES (${seller.id},${seller.slug},${seller.name},${seller.kind},${seller.area},${seller.city},${seller.commissionRate},${seller.rating},${seller.handoverDays}) ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,name=EXCLUDED.name,kind=EXCLUDED.kind,area=EXCLUDED.area,city=EXCLUDED.city,commission_rate=EXCLUDED.commission_rate,rating=EXCLUDED.rating,handover_days=EXCLUDED.handover_days`;
      }

      for (const category of categories) {
        await tx`INSERT INTO categories (slug,name,blurb,image,parent_slug) VALUES (${category.slug},${category.name},${category.blurb},${category.image},${category.parentSlug ?? null}) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,blurb=EXCLUDED.blurb,image=EXCLUDED.image,parent_slug=EXCLUDED.parent_slug`;
      }

      for (const product of products) {
        await tx`
          INSERT INTO products (id,slug,sku,title,short_description,description,category_slug,seller_id,source_type,status,price,compare_at_price,stock,low_stock_threshold,preorder_eta,images,payment_methods,rating,review_count,sold_count,highlights,specs,tags,created_at)
          VALUES (${product.id},${product.slug},${product.sku},${product.title},${product.shortDescription},${product.description},${product.categorySlug},${product.sellerId},${product.sourceType},${product.status},${product.price},${product.compareAtPrice ?? null},${product.stock},${product.lowStockThreshold},${product.preorderEta ?? null},${tx.json(product.images)},${tx.json(["cod","bkash","nagad"])},${product.rating},${product.reviewCount},${product.soldCount},${tx.json(product.highlights)},${tx.json(product.specs)},${tx.json(product.tags)},${product.createdAt})
          ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,sku=EXCLUDED.sku,title=EXCLUDED.title,short_description=EXCLUDED.short_description,description=EXCLUDED.description,category_slug=EXCLUDED.category_slug,seller_id=EXCLUDED.seller_id,source_type=EXCLUDED.source_type,status=EXCLUDED.status,price=EXCLUDED.price,compare_at_price=EXCLUDED.compare_at_price,stock=EXCLUDED.stock,low_stock_threshold=EXCLUDED.low_stock_threshold,preorder_eta=EXCLUDED.preorder_eta,images=EXCLUDED.images,rating=EXCLUDED.rating,review_count=EXCLUDED.review_count,sold_count=EXCLUDED.sold_count,highlights=EXCLUDED.highlights,specs=EXCLUDED.specs,tags=EXCLUDED.tags,created_at=EXCLUDED.created_at
        `;
      }

      for (const coupon of coupons) {
        await tx`INSERT INTO coupons (id,code,label,percent_off,max_discount,expires_at,active) VALUES (${`coupon_${coupon.code.toLowerCase()}`},${coupon.code},${coupon.label},${coupon.percentOff},${coupon.maxDiscount},${"2026-12-31"},true) ON CONFLICT (code) DO UPDATE SET label=EXCLUDED.label,percent_off=EXCLUDED.percent_off,max_discount=EXCLUDED.max_discount,expires_at=EXCLUDED.expires_at,active=EXCLUDED.active`;
      }

      await tx`INSERT INTO addresses (id,user_id,label,recipient_name,phone,area,city,details,is_default) VALUES ('addr_sample','cus_sample','Home','Haatly Customer','01700000000','Dhanmondi','Dhaka','Road 27, Dhaka',true) ON CONFLICT (id) DO NOTHING`;

      for (const order of orders) {
        const method = order.paymentMethod.toLowerCase().includes("bkash")
          ? "bkash"
          : order.paymentMethod.toLowerCase().includes("nagad") ? "nagad" : "cod";
        const subtotal = order.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
        const total = subtotal + order.deliveryFee - order.discount;
        const paymentStatus = method !== "cod" || order.status === "delivered" ? "paid" : "pending";
        const transactionReference = method === "cod" ? null : `SEED-${method.toUpperCase()}-${order.code}`;
        await tx`INSERT INTO orders (code,user_id,phone,status,placed_at,delivery_fee,discount,payment_method,payment_status,payment_reference,subtotal,total,courier,ship_to) VALUES (${order.code},'cus_sample',${order.phone},${order.status},${order.placedAt},${order.deliveryFee},${order.discount},${method},${paymentStatus},${transactionReference},${subtotal},${total},${order.courier},${tx.json(order.shipTo)}) ON CONFLICT (code) DO UPDATE SET user_id=EXCLUDED.user_id,phone=EXCLUDED.phone,status=EXCLUDED.status,placed_at=EXCLUDED.placed_at,delivery_fee=EXCLUDED.delivery_fee,discount=EXCLUDED.discount,payment_method=EXCLUDED.payment_method,payment_status=EXCLUDED.payment_status,payment_reference=EXCLUDED.payment_reference,subtotal=EXCLUDED.subtotal,total=EXCLUDED.total,courier=EXCLUDED.courier,ship_to=EXCLUDED.ship_to`;
        await tx`DELETE FROM payments WHERE id=${`legacy_${order.code}`}`;
        await tx`INSERT INTO payments (id,order_code,provider,status,amount,currency,transaction_reference,verification_status,verification_note,verified_by,verified_at) VALUES (${`fixture_${order.code}`},${order.code},${method},${paymentStatus},${total},'BDT',${transactionReference},${paymentStatus === "paid" ? "verified" : "unverified"},'Seeded payment fixture',${paymentStatus === "paid" ? "seed" : null},${paymentStatus === "paid" ? new Date(order.placedAt) : null}) ON CONFLICT (id) DO UPDATE SET provider=EXCLUDED.provider,status=EXCLUDED.status,amount=EXCLUDED.amount,transaction_reference=EXCLUDED.transaction_reference,verification_status=EXCLUDED.verification_status,verification_note=EXCLUDED.verification_note,verified_by=EXCLUDED.verified_by,verified_at=EXCLUDED.verified_at,updated_at=now()`;
        await tx`DELETE FROM order_items WHERE order_code=${order.code}`;
        await tx`DELETE FROM order_events WHERE order_code=${order.code}`;
        await tx`DELETE FROM seller_orders WHERE order_code=${order.code}`;
        for (const line of order.lines) {
          await tx`INSERT INTO order_items (order_code,seller_id,product_id,title,image,quantity,unit_price) VALUES (${order.code},${line.sellerId},${line.productId},${line.title},${line.image},${line.qty},${line.unitPrice})`;
        }
        for (const event of order.timeline) {
          await tx`INSERT INTO order_events (order_code,status,occurred_at,note) VALUES (${order.code},${event.status},${event.at},${event.note})`;
        }
        const bySeller = new Map<string, number>();
        for (const line of order.lines) bySeller.set(line.sellerId, (bySeller.get(line.sellerId) ?? 0) + line.qty * line.unitPrice);
        for (const [sellerId, subtotal] of bySeller) {
          const seller = sellers.find((item) => item.id === sellerId);
          await tx`INSERT INTO seller_orders (id,order_code,seller_id,status,subtotal,commission_rate) VALUES (${`${order.code}_${sellerId}`},${order.code},${sellerId},${order.status},${subtotal},${seller?.commissionRate ?? 0})`;
        }
      }
    });
    console.log("Seeded marketplace fixtures.");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Failed to seed marketplace fixtures:", error);
  process.exitCode = 1;
});
