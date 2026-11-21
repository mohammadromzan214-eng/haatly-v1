"use client";

import { Heart } from "lucide-react";
import { useCart, useToast } from "./Providers";

export function WishButton({ productId, className = "" }: { productId: string; className?: string }) {
  const { wishlist, toggleWish } = useCart();
  const notify = useToast();
  const active = wishlist.includes(productId);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        notify(toggleWish(productId) ? "Saved to your wishlist" : "Removed from wishlist");
      }}
      className={`grid size-10 place-items-center rounded-full bg-paper/90 backdrop-blur transition hover:scale-110 active:scale-95 ${className}`}
    >
      <Heart className={`size-[18px] transition ${active ? "fill-clay text-clay" : "text-ink"}`} strokeWidth={2} />
    </button>
  );
}
