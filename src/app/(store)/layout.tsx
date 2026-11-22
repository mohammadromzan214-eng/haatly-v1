import { Suspense } from "react";
import { StoreFooter } from "@/components/StoreFooter";
import { StoreHeader } from "@/components/StoreHeader";
import { getStorefrontChrome } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<HeaderLoading />}>
        <StoreHeaderContent />
      </Suspense>
      <div className="min-h-[60vh]">{children}</div>
      <Suspense fallback={<FooterLoading />}>
        <StoreFooterContent />
      </Suspense>
    </>
  );
}

async function StoreHeaderContent() {
  const { categories, settings } = await getStorefrontChrome();
  return <StoreHeader categories={categories} settings={settings} />;
}

async function StoreFooterContent() {
  const { categories, settings } = await getStorefrontChrome();
  return <StoreFooter categories={categories} settings={settings} />;
}

function HeaderLoading() {
  return (
    <header aria-hidden className="sticky top-0 z-40 border-b border-line/70 bg-paper/90">
      <div className="h-9 bg-forest" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5">
        <div className="h-8 w-28 animate-pulse rounded bg-paper-2" />
        <div className="ml-auto h-10 w-40 animate-pulse rounded-full bg-paper-2" />
      </div>
      <div className="mx-auto flex max-w-7xl gap-2 overflow-hidden px-5 pb-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-paper-2" />
        ))}
      </div>
    </header>
  );
}

function FooterLoading() {
  return <div aria-hidden className="mt-24 min-h-80 bg-ink" />;
}
