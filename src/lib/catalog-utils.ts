import type { Product, SourceType, StockBadge } from "./types";

export function stockBadge(product: Pick<Product, "sourceType">): StockBadge {
  if (product.sourceType === "partner_shop") return "partner_shop";
  if (product.sourceType === "pre_order") return "pre_order";
  return "in_stock";
}

export const STOCK_BADGE_LABEL: Record<StockBadge, string> = {
  in_stock: "In Stock",
  partner_shop: "Partner Shop",
  pre_order: "Pre-Order",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  own_stock: "Own Stock",
  partner_shop: "Partner Shop",
  pre_order: "Pre-Order",
};

export function isPurchasable(product: Product) {
  return product.status === "active" && product.stock > 0;
}
