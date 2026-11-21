"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { AddToCartButton } from "./AddToCartButton";
import type { CartItem } from "./Providers";
import { WishButton } from "./WishButton";

export function ProductPurchase({ item, disabled, lowStock }: { item: Omit<CartItem, "qty">; disabled: boolean; lowStock: boolean }) {
  const [qty, setQty] = useState(1);
  const max = Math.max(1, item.maxQty);
  return (
    <div className="space-y-3">
      {!disabled && lowStock && (
        <p className="flex items-center gap-2 text-sm font-semibold text-clay">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clay opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-clay" />
          </span>
          Only {item.maxQty} left — order soon
        </p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-14 items-center rounded-full border border-line bg-paper">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={disabled || qty <= 1}
            className="grid size-14 place-items-center rounded-full transition hover:bg-paper-2 disabled:opacity-30"
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center font-mono text-lg font-semibold" aria-live="polite">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(max, q + 1))}
            disabled={disabled || qty >= max}
            className="grid size-14 place-items-center rounded-full transition hover:bg-paper-2 disabled:opacity-30"
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <AddToCartButton item={item} qty={qty} disabled={disabled} />
        <WishButton productId={item.productId} className="size-14! border border-line" />
      </div>
    </div>
  );
}
