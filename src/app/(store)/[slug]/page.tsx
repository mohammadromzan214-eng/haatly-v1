import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPage } from "@/lib/catalog";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const CONTENT_SLUGS: Record<string, string> = {
  about: "about",
  contact: "contact",
  faq: "faq",
  privacy: "privacy",
  "privacy-policy": "privacy",
  returns: "returns",
  "return-policy": "returns",
  terms: "terms",
  "terms-and-conditions": "terms",
};

async function loadPage(params: Params) {
  const { slug } = await params;
  const contentSlug = CONTENT_SLUGS[slug];
  return contentSlug ? getContentPage(contentSlug) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = await loadPage(params);
  return page ? { title: page.title } : { title: "Page not found" };
}

export default async function ContentPage({ params }: { params: Params }) {
  const page = await loadPage(params);
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-14">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Haatly</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-6xl">{page.title}</h1>
      <div className="mt-8 whitespace-pre-wrap text-base leading-relaxed text-ink-soft">{page.body}</div>
    </main>
  );
}
