"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useCart, useToast } from "@/components/Providers";
import { isPurchasable } from "@/lib/catalog-utils";
import { toCartItem } from "@/lib/cart";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export default function ProfileWishlistPage() {
  const { wishlist, toggleWish, add } = useCart();
  const notify = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoaded(false);
    if (wishlist.length === 0) {
      setProducts([]);
      setError("");
      setLoaded(true);
      return () => { active = false; };
    }
    fetch(`/api/catalog/products?ids=${encodeURIComponent(wishlist.join(","))}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { products?: Product[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load wishlist products.");
        if (active) {
          setProducts(result.products ?? []);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load wishlist products.");
      })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [wishlist]);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-clay">Account</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Wishlist</h1>
      {error && <p role="alert" className="mt-6 rounded-2xl bg-clay/10 p-4 text-sm text-clay">{error}</p>}
      {!loaded ? (
        <div className="mt-8 animate-pulse rounded-[28px] bg-paper-2 py-16" aria-busy="true" />
      ) : products.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-line py-16 text-center">
          <Heart className="mx-auto size-10 text-clay" />
          <p className="mt-4 font-display text-xl font-bold">Your wishlist is empty</p>
          <Link href="/products" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">Browse products</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            return (
              <article key={product.id} className="overflow-hidden rounded-[24px] border border-line bg-paper">
                <ProductCard product={product} />
                <div className="flex items-center gap-2 px-4 pb-4">
                  {isPurchasable(product) ? (
                    <button type="button" onClick={() => { add(toCartItem(product)); notify("Moved to bag"); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-paper hover:bg-clay">
                      <ShoppingBag className="size-4" /> Move to cart
                    </button>
                  ) : (
                    <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-paper-2 px-3 py-2 text-xs font-semibold text-muted"><ShoppingBag className="size-4" />Unavailable</span>
                  )}
                  <button
                    type="button"
                    onClick={() => { toggleWish(product.id); notify("Removed from wishlist"); }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-semibold hover:border-clay hover:text-clay"
                  >
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
