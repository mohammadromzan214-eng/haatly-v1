import Link from "next/link";
import { site } from "@/lib/site";

export function Logo({ tone = "ink", href = "/", name = site.name }: { tone?: "ink" | "paper"; href?: string; name?: string }) {
  const color = tone === "ink" ? "text-ink" : "text-paper";
  return (
    <Link href={href} className={`group inline-flex items-center gap-2 ${color}`} aria-label={`${name} home`}>
      <svg viewBox="0 0 32 32" className="size-8 transition-transform duration-500 group-hover:rotate-[18deg]" aria-hidden>
        <circle cx="16" cy="16" r="15" className="fill-clay" />
        <path d="M8 19c2.4-6 13.6-6 16 0" className="stroke-paper" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M11 13.5v-2.5M16 12v-3.5M21 13.5v-2.5" className="stroke-marigold" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="font-display text-2xl font-extrabold tracking-tight">{name?.toUpperCase()}</span>
    </Link>
  );
}
