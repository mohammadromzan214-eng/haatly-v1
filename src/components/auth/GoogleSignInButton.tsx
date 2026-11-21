"use client";

export function GoogleSignInButton({ next = "/profile" }: { next?: string }) {
  const href = `/api/customer/oauth/google/start?next=${encodeURIComponent(next)}`;
  return (
    <a href={href} onClick={(event) => {
      if (new URLSearchParams(window.location.search).get("next") === "/checkout") {
        event.currentTarget.href = `/api/customer/oauth/google/start?next=${encodeURIComponent("/checkout")}`;
      }
    }} className="inline-flex h-13 w-full items-center justify-center gap-3 rounded-full border border-line bg-paper px-6 py-3.5 font-semibold text-ink transition hover:border-ink">
      <span aria-hidden="true" className="font-display text-lg font-extrabold text-[#4285F4]">G</span>
      Continue with Google
    </a>
  );
}
