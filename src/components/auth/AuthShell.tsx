import Link from "next/link";
import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-5 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(226,162,58,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(31,74,58,0.75),transparent_42%)]" />
      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex font-display text-2xl font-extrabold text-paper"
          aria-label="TOQAEE home"
        >
          TOQAEE
        </Link>

        <div className="rounded-[32px] bg-paper p-7 shadow-2xl md:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">
            {eyebrow}
          </p>

          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
            {title}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {description}
          </p>

          <div className="mt-7">{children}</div>

          <div className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
            {footer}
          </div>
        </div>
      </div>
    </main>
  );
}