import Link from "next/link";
import { Star } from "lucide-react";
import { isPurchasable, stockBadge } from "@/lib/catalog-utils";
import { toCartItem } from "@/lib/cart";
import { cdn } from "@/lib/image";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "./AddToCartButton";
import { Price } from "./Price";
import { StockBadge } from "./StockBadge";
import { WishButton } from "./WishButton";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const seller = product.seller;
  const soldOut = !isPurchasable(product);
  return (
    <article className="group relative flex flex-col">
      <Link href={`/products/${product.slug}`} className="relative block overflow-hidden rounded-[22px] bg-paper-2">
        <img
          src={cdn(product.images?.[0] || '/placeholder.png', 560, 640)}
          alt={product.title}
          width={560}
          height={640}
          loading={priority ? "eager" : "lazy"}
          className={`aspect-[7/8] w-full object-cover transition duration-700 group-hover:scale-[1.04] ${soldOut ? "opacity-60 grayscale-[35%]" : ""}`}
        />
        <div className="absolute left-3 top-3">
          <StockBadge badge={stockBadge(product)} eta={product.preorderEta} />
        </div>
        {product.status === "out_of_stock" && (
          <div className="absolute inset-x-3 bottom-3 rounded-full bg-ink/85 py-2 text-center text-xs font-semibold uppercase tracking-widest text-paper backdrop-blur">
            Out of stock · restocking
          </div>
        )}
      </Link>
      <WishButton productId={product.id} className="absolute right-3 top-3" />
      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted">{seller?.name}</p>
          <h3 className="mt-1 font-display text-lg font-semibold leading-snug tracking-tight">
            <Link href={`/products/${product.slug}`} className="hover:text-clay">
              {product.title}
            </Link>
          </h3>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <Star className="size-3.5 fill-marigold text-marigold" />
            <span className="font-semibold text-ink">{product.rating.toFixed(1)}</span>
            <span>({product.reviewCount.toLocaleString("en-IN")})</span>
            <span aria-hidden>·</span>
            <span>{product.soldCount.toLocaleString("en-IN")} sold</span>
          </div>
          <div className="mt-2">
            <Price price={product.price} compareAt={product.compareAtPrice} />
          </div>
        </div>
        <div className="pt-6">
          <AddToCartButton item={toCartItem(product, seller)} disabled={soldOut} variant="compact" />
        </div>
      </div>
    </article>
  );
}
