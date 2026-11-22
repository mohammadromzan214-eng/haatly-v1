import Link from "next/link";

export default function StoreLoading() {
  return (
    <main aria-busy="true" className="mx-auto max-w-7xl px-5 pb-10">
      <section className="relative isolate min-h-[78vh] overflow-hidden rounded-[32px] bg-clay px-8 py-12 text-paper md:px-14">
        <img src="/img/hero.png" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-clay via-clay/80 to-transparent" />
        <div className="flex min-h-[52vh] flex-col justify-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-marigold-soft">Online haat · Est. Dhaka</p>
          <h1 className="mt-5 font-display text-[clamp(3rem,7.5vw,6.5rem)] font-extrabold leading-[0.88] tracking-[-0.035em]">
            The whole haat,
            <br />
            <span className="italic text-marigold-soft">one tap</span> away.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-paper/85">
            Warehouse-fresh essentials, handpicked partner stalls from Rupganj to Jashore, and early pre-orders — delivered to all 64 districts.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/products" className="rounded-full bg-paper px-7 py-4 font-semibold text-ink">
              Shop the haat
            </Link>
            <Link href="/track-order" className="rounded-full border border-paper/40 px-7 py-4 font-semibold text-paper">
              Track an order
            </Link>
          </div>
        </div>
      </section>
      <section aria-hidden className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[7/8] rounded-[22px] bg-paper-2" />
            <div className="mt-4 h-4 w-2/3 rounded-full bg-paper-2" />
            <div className="mt-3 h-5 rounded-full bg-paper-2" />
          </div>
        ))}
      </section>
    </main>
  );
}
