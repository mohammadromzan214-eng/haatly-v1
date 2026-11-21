import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cdn } from "@/lib/image";

interface Crumb { href?: string; label: string }

export function PageIntro({ eyebrow, title, body, crumbs, image }: { eyebrow?: string; title: string; body?: string; crumbs?: Crumb[]; image?: string }) {
  return (
    <section className="relative flex items-end justify-between gap-8 border-b border-line py-10 md:py-14">
      <div className="animate-rise max-w-2xl">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-xs text-muted">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1">
                {c.href ? <Link href={c.href} className="hover:text-ink">{c.label}</Link> : <span className="text-ink">{c.label}</span>}
                {i < crumbs.length - 1 && <ChevronRight className="size-3" />}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="font-mono text-xs uppercase tracking-[0.3em] text-clay">{eyebrow}</p>}
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.92] tracking-[-0.03em] md:text-7xl">{title}</h1>
        {body && <p className="mt-5 max-w-lg text-lg text-ink-soft">{body}</p>}
      </div>
      {image && (
        <img src={cdn(image, 320, 320)} alt="" className="animate-fade hidden size-40 rotate-3 rounded-[28px] object-cover shadow-[12px_12px_0_0_var(--color-paper-3)] md:block" />
      )}
    </section>
  );
}
