import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { PageIntro } from "@/components/PageIntro";
import { getCategoryBySlug, listCategories, listProductsByCategory } from "@/lib/catalog";

export const dynamic = "force-dynamic";

type Params = Promise<{ category: string }>;
type SearchParams = Promise<{ q?: string; source?: string; sort?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const cat = await getCategoryBySlug((await params).category);
  return { title: cat ? cat.name : "Category" };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { category } = await params;
  const [cat, categories] = await Promise.all([getCategoryBySlug(category), listCategories()]);
  if (!cat) notFound();
  const initial = await searchParams;
  const products = await listProductsByCategory(cat.slug);

  return (
    <main className="mx-auto max-w-7xl px-5 pb-10">
      <PageIntro
        eyebrow={`${products.length} products`}
        title={cat.name}
        body={cat.blurb}
        image={cat.image}
        crumbs={[{ href: "/", label: "Home" }, { href: "/products", label: "Shop" }, { label: cat.name }]}
      />
      <Suspense>
        <CatalogBrowser products={products} categories={categories} fixedCategory={cat.slug} initial={initial} />
      </Suspense>
    </main>
  );
}
