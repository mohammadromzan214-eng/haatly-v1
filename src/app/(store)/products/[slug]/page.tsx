import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, ChevronRight, Handshake, MapPin, RotateCcw, ShieldCheck, Star, Truck, Warehouse } from "lucide-react";
import { Price } from "@/components/Price";
import { ProductCard } from "@/components/ProductCard";
import { ProductPurchase } from "@/components/ProductPurchase";
import { StockBadge } from "@/components/StockBadge";
import { toCartItem } from "@/lib/cart";
import { getBusinessSettings, getCategoryBySlug, getRelatedStorefrontProducts, getStorefrontProductBySlug, isPurchasable, stockBadge } from "@/lib/catalog";
import { cdn } from "@/lib/image";
import { formatPrice, site } from "@/lib/site";
import { PAYMENT_METHOD_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getStorefrontProductBySlug((await params).slug);
  return p ? { title: p.title, description: p.shortDescription } : { title: "Product" };
}

export default async function ProductPage({ params }: { params: Params }) {
  const product = await getStorefrontProductBySlug((await params).slug);
  if (!product) notFound();

  const seller = product.seller;
  const [category, related, settings] = await Promise.all([
    getCategoryBySlug(product.categorySlug),
    getRelatedStorefrontProducts(product),
    getBusinessSettings(),
  ]);
  const badge = stockBadge(product);
  const purchasable = isPurchasable(product);
  const lowStock = product.sourceType !== "pre_order" && product.stock > 0 && product.stock <= product.lowStockThreshold;

  const fulfilment =
    badge === "in_stock"
      ? { icon: Warehouse, title: "Ships from Haatly’s own warehouse", body: `Packed at ${settings.address.split(",")[0] || "our fulfilment centre"} — usually leaves the same day.`, eta: "Delivered in 1–3 days" }
      : badge === "partner_shop"
        ? { icon: Handshake, title: `Sourced from ${seller?.name}`, body: `A vetted partner stall in ${seller?.area}, ${seller?.city}. Quality-checked at our hub before dispatch.`, eta: `Delivered in ${2 + (seller?.handoverDays ?? 1)}–${4 + (seller?.handoverDays ?? 1)} days` }
        : { icon: CalendarClock, title: `Pre-order · dispatches from ${product.preorderEta}`, body: "Your unit is reserved the moment you order. We notify you by SMS when it ships.", eta: `Ships ${product.preorderEta}` };

  return (
    <main className="mx-auto max-w-7xl px-5">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 py-6 text-xs text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <ChevronRight className="size-3" />
        <Link href="/products" className="hover:text-ink">Shop</Link>
        <ChevronRight className="size-3" />
        {category && <><Link href={`/products/category/${category.slug}`} className="hover:text-ink">{category.name}</Link><ChevronRight className="size-3" /></>}
        <span className="truncate text-ink">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        {/* Gallery */}
        <div className="animate-fade lg:sticky lg:top-40 lg:self-start">
          <div className="relative overflow-hidden rounded-[32px] bg-paper-2">
            <img
              src={cdn(product.images[0], 1100, 1100)}
              alt={product.title}
              width={1100}
              height={1100}
              fetchPriority="high"
              className={`aspect-square w-full object-cover ${purchasable ? "" : "opacity-70 grayscale-[30%]"}`}
            />
            <div className="absolute left-5 top-5"><StockBadge badge={badge} eta={product.preorderEta} size="md" /></div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`overflow-hidden rounded-2xl bg-paper-2 ${i === 0 ? "ring-2 ring-ink" : "opacity-70"}`}>
                <img
                  src={cdn(product.images[0], 240, 240)}
                  alt=""
                  className="aspect-square w-full object-cover"
                  style={{ transformOrigin: ["center", "25% 30%", "75% 40%", "50% 80%"][i], transform: i ? "scale(1.8)" : undefined }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Buy box */}
        <div className="animate-rise">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {seller?.kind === "platform" ? <BadgeCheck className="size-4 text-forest" /> : <Handshake className="size-4 text-marigold" />}
            {seller?.name}
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.025em] md:text-5xl">{product.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`size-4 ${s <= Math.round(product.rating) ? "fill-marigold text-marigold" : "text-line"}`} />
              ))}
              <span className="ml-1 font-semibold">{product.rating.toFixed(1)}</span>
            </span>
            <span className="text-muted">{product.reviewCount.toLocaleString("en-IN")} reviews</span>
            <span className="text-muted">·</span>
            <span className="text-muted">{product.soldCount.toLocaleString("en-IN")} sold</span>
          </div>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">{product.shortDescription}</p>

          <div className="mt-8 border-t border-line pt-8">
            <Price price={product.price} compareAt={product.compareAtPrice} size="lg" />
            <p className="mt-1 text-xs text-muted">Inclusive of VAT · SKU <span className="font-mono">{product.sku}</span></p>
          </div>

          <div className="mt-8">
            {product.status === "out_of_stock" && (
              <p className="mb-4 rounded-2xl bg-paper-2 px-4 py-3 text-sm text-ink-soft">
                This item sold out. Save it to your wishlist and we’ll show you when it’s back on the shelf.
              </p>
            )}
            <ProductPurchase item={toCartItem(product, seller)} disabled={!purchasable} lowStock={lowStock} />
          </div>

          <div className="mt-8 rounded-3xl border border-line bg-paper-2/50 p-5">
            <div className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-paper"><fulfilment.icon className="size-5" /></span>
              <div>
                <p className="font-semibold">{fulfilment.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{fulfilment.body}</p>
              </div>
            </div>
            <div className="stitch my-5 text-line" />
            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              <li className="flex items-center gap-2"><Truck className="size-4 text-clay" />{fulfilment.eta}</li>
              <li className="flex items-center gap-2"><MapPin className="size-4 text-clay" />Inside Dhaka {formatPrice(site.delivery.insideDhaka)} · Outside {formatPrice(site.delivery.outsideDhaka)}</li>
              <li className="flex items-center gap-2"><RotateCcw className="size-4 text-clay" />7-day easy returns</li>
              <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-clay" />Available payment methods: {(product.paymentMethods ?? []).map((method) => PAYMENT_METHOD_LABEL[method]).join(", ") || "Contact us"}</li>
            </ul>
          </div>

          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold tracking-tight">About this item</h2>
            <p className="mt-3 leading-relaxed text-ink-soft">{product.description}</p>
            {product.highlights.length > 0 && (
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-clay" />{h}</li>
                ))}
              </ul>
            )}
          </section>

          {Object.keys(product.specs).length > 0 && (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-bold tracking-tight">Specifications</h2>
              <dl className="mt-4 divide-y divide-line border-y border-line text-sm">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-4 py-3">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      <section className="mt-28">
        <h2 className="font-display text-4xl font-bold tracking-tight">You might also carry home</h2>
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </main>
  );
}
