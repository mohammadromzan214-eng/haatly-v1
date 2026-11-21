import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { PageIntro } from "@/components/PageIntro";
import { listCategories, listStorefrontProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop all products" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; source?: string; sort?: string; category?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const initial = await searchParams;
  const [products, categories] = await Promise.all([listStorefrontProducts(), listCategories()]);
  return (
    <main className="mx-auto max-w-7xl px-5 pb-10">
      <PageIntro
        eyebrow={`${products.length} products · 6 aisles`}
        title={initial.q ? `Results for “${initial.q}”` : "The whole haat"}
        body="Own-stock essentials, partner-shop finds and dated pre-orders — filter by where it ships from."
        crumbs={[{ href: "/", label: "Home" }, { label: "Shop" }]}
      />
      <Suspense>
        <CatalogBrowser key={initial.q ?? ""} products={products} categories={categories} initial={initial} />
      </Suspense>
    </main>
  );
}
