import "server-only";
import { cache } from "react";
import {
  getBusinessSettings as readBusinessSettings,
  listCategories as readCategories,
} from "./db/storefront-repository";

export {
  getCategoryBySlug,
  getContentPage,
  getRelatedStorefrontProducts,
  getSellersByIds,
  getStorefrontProductBySlug,
  getStorefrontProductsByIds,
  listActiveBanners,
  listActiveCoupons,
  listProductsByCategory,
  listSellers,
  listStorefrontProducts,
} from "./db/storefront-repository";

export const getBusinessSettings = cache(readBusinessSettings);
export const listCategories = cache(readCategories);
export const getStorefrontChrome = cache(async () => {
  const [categories, settings] = await Promise.all([readCategories(), readBusinessSettings()]);
  return { categories, settings };
});

export { isPurchasable, SOURCE_TYPE_LABEL, stockBadge, STOCK_BADGE_LABEL } from "./catalog-utils";
