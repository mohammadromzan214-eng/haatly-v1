import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarClock, Handshake, MapPin, PackageCheck, Star } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { getBusinessSettings, listActiveBanners, listActiveCoupons, listCategories, listSellers, listStorefrontProducts } from "@/lib/catalog";
import { cdn } from "@/lib/image";
import { ORDER_FLOW, ORDER_STATUS_LABEL } from "@/lib/types";
import { formatPrice, site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, categories, sellers, banners, coupons, settings] = await Promise.all([
    listStorefrontProducts(),
    listCategories(),
    listSellers(),
    listActiveBanners(),
    listActiveCoupons(),
    getBusinessSettings(),
  ]);
  const bestsellers = [...products].filter((p) => p.status === "active").sort((a, b) => b.soldCount - a.soldCount).slice(0, 4);
  const fresh = [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const [hero, ...restCats] = categories;
  const partners = sellers.filter((s) => s.kind === "partner");
  const heroBanner = banners.find((banner) => banner.placement === "Hero") ?? banners.find((banner) => banner.placement === "Slider");
  const secondaryBanners = banners.filter((banner) => banner.id !== heroBanner?.id);
  const coupon = coupons[0];

  return (
    <main>
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative isolate overflow-hidden bg-clay">
        <picture>
          <source media="(min-width: 1024px)" srcSet={cdn(heroBanner?.image ?? "/img/hero.png", 1920, 1080)} />
          <img
            src={cdn(heroBanner?.image ?? "/img/hero.png", 1100, 1100)}
            alt="Jamdani saree, earbuds, estate tea and leather sandals laid out on a terracotta cloth"
            className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-50 lg:opacity-100"
            fetchPriority="high"
          />
        </picture>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-clay via-clay/80 to-transparent lg:via-clay/30" />
        <div className="mx-auto grid min-h-[78vh] max-w-7xl items-center px-5 py-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-paper">
            <p className="animate-rise font-mono text-xs uppercase tracking-[0.3em] text-marigold-soft">Online haat · Est. Dhaka</p>
            <h1 className="animate-rise mt-5 font-display text-[clamp(3rem,7.5vw,6.5rem)] font-extrabold leading-[0.88] tracking-[-0.035em] [animation-delay:80ms]">
              The whole haat,
              <br />
              <span className="italic text-marigold-soft">one tap</span> away.
            </h1>
            <p className="animate-rise mt-7 max-w-md text-lg leading-relaxed text-paper/85 [animation-delay:160ms]">
              Warehouse-fresh essentials, handpicked partner stalls from Rupganj to Jashore, and early pre-orders — delivered to all 64 districts.
            </p>
            <div className="animate-rise mt-9 flex flex-wrap gap-3 [animation-delay:240ms]">
              <Link href="/products" className="group inline-flex h-14 items-center gap-2 rounded-full bg-paper px-7 font-semibold text-ink transition hover:bg-marigold-soft">
                Shop the haat
                <ArrowRight className="size-5 transition group-hover:translate-x-1" />
              </Link>
              <Link href="/track-order" className="inline-flex h-14 items-center rounded-full border border-paper/40 px-7 font-semibold text-paper transition hover:bg-paper/10">
                Track an order
              </Link>
            </div>
            <dl className="animate-rise mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-paper/25 pt-6 [animation-delay:320ms]">
              <div><dt className="text-xs text-paper/70">Parcels in Nov</dt><dd className="font-display text-2xl font-bold">12,438</dd></div>
              <div><dt className="text-xs text-paper/70">Partner stalls</dt><dd className="font-display text-2xl font-bold">41</dd></div>
              <div><dt className="text-xs text-paper/70">Avg. rating</dt><dd className="flex items-center gap-1 font-display text-2xl font-bold">4.7<Star className="size-4 fill-marigold text-marigold" /></dd></div>
            </dl>
          </div>
        </div>
      </section>

      {secondaryBanners.length > 0 && (
        <section className="mx-auto mt-10 grid max-w-7xl gap-4 px-5 sm:grid-cols-2">
          {secondaryBanners.map((banner) => (
            <Link key={banner.id} href="/products" className="group relative min-h-48 overflow-hidden rounded-[28px] bg-ink">
              <img src={cdn(banner.image, 900, 480)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <h2 className="absolute inset-x-6 bottom-5 font-display text-2xl font-bold text-paper">{banner.title}</h2>
            </Link>
          ))}
        </section>
      )}

      {/* ------------------------------------------------------ Categories */}
      {hero && <section className="mx-auto max-w-7xl px-5 pt-20">
        <div className="flex items-end justify-between gap-6">
          <h2 className="max-w-xl font-display text-4xl font-bold leading-[0.95] tracking-tight md:text-5xl">Walk the aisles.</h2>
          <Link href="/products" className="hidden items-center gap-1 text-sm font-semibold hover:text-clay sm:inline-flex">
            All products <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-4 md:grid-rows-2">
          <Link href={`/products/category/${hero.slug}`} className="group relative overflow-hidden rounded-[28px] bg-paper-2 md:col-span-2 md:row-span-2">
            <img src={cdn(hero.image, 900, 900)} alt="" className="aspect-square h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-7 pt-24 text-paper">
              <p className="font-mono text-xs uppercase tracking-widest text-marigold-soft">01</p>
              <h3 className="mt-1 font-display text-3xl font-bold">{hero.name}</h3>
              <p className="text-sm text-paper/80">{hero.blurb}</p>
            </div>
          </Link>
          {restCats.slice(0, 4).map((c, i) => (
            <Link key={c.slug} href={`/products/category/${c.slug}`} className="group relative flex items-end overflow-hidden rounded-[28px] bg-paper-2 p-5">
              <img src={cdn(c.image, 480, 480)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/5 to-transparent" />
              <div className="relative mt-32 text-paper">
                <p className="font-mono text-[11px] uppercase tracking-widest text-marigold-soft">0{i + 2}</p>
                <h3 className="font-display text-xl font-bold">{c.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>}

      {/* -------------------------------------------- How we stock (badges) */}
      <section className="mx-auto mt-24 max-w-7xl px-5">
        <div className="rounded-[32px] bg-ink px-6 py-14 text-paper md:px-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-marigold">Know before you buy</p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-[0.95] tracking-tight">Every product tells you where it ships from.</h2>
              <p className="mt-5 text-paper/70">Look for the badge on every listing — it sets honest expectations on delivery time before you check out.</p>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                { icon: PackageCheck, tone: "bg-forest", label: "In Stock", body: "Sitting on a shelf in our Tejgaon fulfilment centre. Packed same day, delivered in 1–3 days.", eta: "1–3 days" },
                { icon: Handshake, tone: "bg-marigold text-ink", label: "Partner Shop", body: "Sourced from a vetted stall — weavers, gadget shops, kitchen stores. Quality-checked at our hub.", eta: "+1–3 days" },
                { icon: CalendarClock, tone: "bg-indigo", label: "Pre-Order", body: "Reserve stock that’s on its way — a new kiln batch or an incoming container. Ships on the date shown.", eta: "Dated" },
              ].map((b, i) => (
                <li key={b.label} className={`flex flex-col rounded-3xl border border-paper/10 bg-paper/[0.04] p-6 ${i === 1 ? "md:translate-y-6" : ""} ${i === 2 ? "md:translate-y-12" : ""}`}>
                  <span className={`grid size-12 place-items-center rounded-2xl ${b.tone}`}><b.icon className="size-6" /></span>
                  <h3 className="mt-6 font-display text-2xl font-semibold">{b.label}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-paper/70">{b.body}</p>
                  <p className="mt-6 font-mono text-xs uppercase tracking-widest text-marigold">{b.eta}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Bestsellers */}
      <section className="mx-auto mt-28 max-w-7xl px-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Most carried home</p>
            <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Bestsellers</h2>
          </div>
          <Link href="/products?sort=popular" className="inline-flex items-center gap-1 text-sm font-semibold hover:text-clay">
            See more <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {bestsellers.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)}
        </div>
      </section>

      {/* ------------------------------------------------------- Offer band */}
      {coupon && <section className="mx-auto mt-28 max-w-7xl px-5">
        <div className="relative overflow-hidden rounded-[32px] bg-marigold px-8 py-12 md:px-14">
          <div className="stitch absolute inset-x-8 top-5 text-ink/25" />
          <div className="stitch absolute inset-x-8 bottom-5 text-ink/25" />
          <div className="grid items-center gap-8 md:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink/70">First order</p>
              <h2 className="mt-3 font-display text-4xl font-extrabold leading-[0.95] tracking-tight md:text-6xl">
                Take {coupon.percentOff}% off, up to {formatPrice(coupon.maxDiscount)}.
              </h2>
              <p className="mt-4 max-w-md text-ink/75">Apply the code in your bag. Works on own-stock, partner and pre-order items alike.</p>
            </div>
            <div className="justify-self-start md:justify-self-end">
              <div className="rotate-[-3deg] rounded-2xl border-2 border-dashed border-ink bg-paper px-8 py-6 text-center shadow-[8px_8px_0_0_var(--color-ink)]">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">Use code</p>
                <p className="mt-1 font-mono text-4xl font-bold tracking-wider">{coupon.code}</p>
              </div>
            </div>
          </div>
        </div>
      </section>}

      {/* ------------------------------------------------------ Fresh in */}
      <section className="mx-auto mt-28 max-w-7xl px-5">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Just unpacked</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">Fresh in the haat</h2>
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {fresh.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* -------------------------------------------------- Partner stalls */}
      <section className="mx-auto mt-28 max-w-7xl px-5">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Meet the stalls</p>
            <h2 className="mt-2 font-display text-4xl font-bold leading-[0.95] tracking-tight md:text-5xl">Small makers, one checkout.</h2>
            <p className="mt-5 max-w-sm text-ink-soft">
              Our partner shops list alongside our own stock. You pay once, we quality-check at the hub and deliver everything together.
            </p>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {partners.map((s) => (
              <li key={s.id} className="group flex items-center justify-between gap-4 py-5">
                <div>
                  <p className="font-display text-2xl font-semibold tracking-tight transition group-hover:translate-x-1 group-hover:text-clay">{s.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin className="size-3.5" />{s.area}, {s.city}</p>
                </div>
                <p className="flex items-center gap-1 font-mono text-sm"><Star className="size-4 fill-marigold text-marigold" />{s.rating.toFixed(1)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------- Order journey */}
      <section className="mx-auto mt-28 max-w-7xl px-5">
        <div className="rounded-[32px] border border-line bg-paper-2/60 px-6 py-12 md:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">Seven honest steps</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">Follow your parcel from our shelf to your door.</h2>
            </div>
            <Link href="/track-order" className="inline-flex h-12 items-center gap-2 rounded-full border border-ink px-6 text-sm font-semibold hover:bg-ink hover:text-paper">
              Track an order <ArrowRight className="size-4" />
            </Link>
          </div>
          <ol className="no-scrollbar mt-10 flex gap-3 overflow-x-auto pb-2">
            {ORDER_FLOW.map((s, i) => (
              <li key={s} className="flex shrink-0 items-center gap-3">
                <span className="flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-medium shadow-sm">
                  <span className="font-mono text-xs text-clay">{String(i + 1).padStart(2, "0")}</span>
                  {ORDER_STATUS_LABEL[s]}
                </span>
                {i < ORDER_FLOW.length - 1 && <span className="h-px w-6 bg-ink/30" />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <p className="sr-only">{settings.storeName} — {site.description}</p>
    </main>
  );
}
