import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-start justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">404 · Stall not found</p>
      <h1 className="mt-4 font-display text-5xl font-bold leading-[0.95] tracking-tight">
        This aisle of the haat is still being set up.
      </h1>
      <p className="mt-5 text-ink-soft">The page you were looking for doesn’t exist yet, or has moved.</p>
      <Link href="/products" className="mt-8 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper hover:bg-forest">
        Browse the shop
      </Link>
    </main>
  );
}
