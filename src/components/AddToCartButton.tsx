"use client";

import { ShoppingBag } from "lucide-react";
import type { CartItem } from "./Providers";
import { useCart, useToast } from "./Providers";

interface Props {
  item: Omit<CartItem, "qty">;
  qty?: number;
  disabled?: boolean;
  variant?: "solid" | "compact";
  label?: string;
}

export function AddToCartButton({ item, qty = 1, disabled, variant = "solid", label }: Props) {
  const { add } = useCart();
  const notify = useToast();
  const text = label ?? (item.badge === "pre_order" ? "Pre-order" : "Add to bag");

  if (variant === "compact") {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={`${text}: ${item.title}`}
        onClick={(e) => {
          e.preventDefault();
          add(item, 1);
          notify(`${item.title.split(",")[0]} added to bag`);
        }}
        className="grid size-10 place-items-center rounded-full bg-ink text-paper transition hover:bg-clay active:scale-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
      >
        <ShoppingBag className="size-[18px]" strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        add(item, qty);
        notify(`${qty} × ${item.title.split(",")[0]} added to bag`);
      }}
      className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-8 text-base font-semibold text-paper transition hover:bg-clay active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
    >
      <ShoppingBag className="size-5" strokeWidth={2} />
      {disabled ? "Currently unavailable" : text}
    </button>
  );
}
