import type { CartItem } from "@/components/Providers";
import { stockBadge } from "./catalog-utils";
import type { Product } from "./types";

export function toCartItem(p: Product, seller: Product["seller"] = p.seller): Omit<CartItem, "qty"> {
  return {
    productId: p.id,
    slug: p.slug,
    title: p.title,
    image: p.images[0] ?? "/placeholder.png",
    price: p.price,
    sellerId: p.sellerId,
    sellerName: seller?.name ?? p.seller?.name ?? "Haatly Retail",
    badge: stockBadge(p),
    preorderEta: p.preorderEta,
    maxQty: Math.max(0, Math.min(p.stock, 10)),
  };
}
