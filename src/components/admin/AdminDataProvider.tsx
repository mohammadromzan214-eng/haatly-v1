"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { categories as fixtureCategories, coupons as fixtureCoupons, products as fixtureProducts } from "@/lib/fixtures";
import type { Category, PaymentMethod, Product, ProductStatus, Seller, SourceType } from "@/lib/types";

export type AdminProduct = Product & { paymentMethods: PaymentMethod[] };
export interface AdminCoupon {
  id: string;
  code: string;
  label: string;
  percentOff: number;
  maxDiscount: number;
  expiresAt: string;
  active: boolean;
}
export interface AdminBanner {
  id: string;
  title: string;
  placement: "Hero" | "Slider" | "Promotional" | "Campaign" | "Featured section";
  image: string;
  active: boolean;
}
export interface AdminSettings {
  storeName: string;
  phone: string;
  whatsapp: string;
  email: string;
  facebook: string;
  instagram: string;
  youtube: string;
  address: string;
}
export type AdminContentKey = "about" | "contact" | "faq" | "privacy" | "returns" | "terms";
export type AdminContent = Record<AdminContentKey, string>;

interface AdminDataValue {
  ready: boolean;
  error: string;
  products: AdminProduct[];
  categories: Category[];
  sellers: Seller[];
  coupons: AdminCoupon[];
  banners: AdminBanner[];
  settings: AdminSettings;
  content: AdminContent;
  saveProduct: (product: AdminProduct) => void;
  deleteProduct: (id: string) => void;
  saveCategory: (category: Category) => void;
  deleteCategory: (slug: string) => void;
  saveCoupon: (coupon: AdminCoupon) => void;
  deleteCoupon: (id: string) => void;
  setBanners: (banners: AdminBanner[]) => void;
  setSettings: (settings: AdminSettings) => void;
  setContent: (content: AdminContent) => void;
}

const AdminDataContext = createContext<AdminDataValue | null>(null);

const initialProducts: AdminProduct[] = fixtureProducts.map((product) => ({
  ...product,
  paymentMethods: ["cod", "bkash", "nagad"],
}));
const initialCoupons: AdminCoupon[] = fixtureCoupons.map((coupon, index) => ({
  id: `coupon_${index + 1}`,
  ...coupon,
  expiresAt: "2026-12-31",
  active: true,
}));
const initialBanners: AdminBanner[] = [
  { id: "banner_hero", title: "Homepage Hero", placement: "Hero", image: "/img/hero.png", active: true },
  { id: "banner_featured", title: "Bestseller feature", placement: "Featured section", image: "/img/earbuds.png", active: true },
];
const initialSettings: AdminSettings = {
  storeName: "Haatly",
  phone: "09612-428759",
  whatsapp: "",
  email: "care@haatly.com.bd",
  facebook: "",
  instagram: "",
  youtube: "",
  address: "Haatly Fulfilment Centre, Tejgaon I/A, Dhaka",
};
const initialContent: AdminContent = {
  about: "Haatly is a Bangladeshi online bazaar bringing together own-stock essentials and curated partner sellers.",
  contact: "Contact Haatly support by phone or email.",
  faq: "Frequently asked questions will be published here.",
  privacy: "Privacy policy content.",
  returns: "Return policy content.",
  terms: "Terms and conditions content.",
};

interface AdminSnapshot {
  products?: AdminProduct[];
  categories?: Category[];
  sellers?: Seller[];
  coupons?: AdminCoupon[];
  banners?: AdminBanner[];
  settings?: AdminSettings;
  content?: AdminContent;
}

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(fixtureCategories);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [banners, setBannersState] = useState(initialBanners);
  const [settings, setSettingsState] = useState(initialSettings);
  const [content, setContentState] = useState(initialContent);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/data", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json() as AdminSnapshot & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load admin data.");
        if (!active) return;
        if (result.products) setProducts(result.products);
        if (result.categories) setCategories(result.categories);
        if (result.sellers) setSellers(result.sellers);
        if (result.coupons) setCoupons(result.coupons);
        if (result.banners) setBannersState(result.banners);
        if (result.settings) setSettingsState(result.settings);
        if (result.content) setContentState(result.content);
        setError("");
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not connect to the database.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const persist = useCallback(async (entity: string, operation: "upsert" | "delete", data: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/admin/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ entity, operation, data }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not save changes.");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save changes.");
    }
  }, []);

  const saveProduct = useCallback((product: AdminProduct) => {
    void persist("product", "upsert", product as unknown as Record<string, unknown>);
    setProducts((current) => current.some((item) => item.id === product.id)
      ? current.map((item) => item.id === product.id ? product : item)
      : [product, ...current]);
  }, [persist]);
  const deleteProduct = useCallback((id: string) => {
    void persist("product", "delete", { id });
    setProducts((current) => current.filter((product) => product.id !== id));
  }, [persist]);
  const saveCategory = useCallback((category: Category) => {
    void persist("category", "upsert", category as unknown as Record<string, unknown>);
    setCategories((current) => current.some((item) => item.slug === category.slug)
      ? current.map((item) => item.slug === category.slug ? category : item)
      : [...current, category]);
  }, [persist]);
  const deleteCategory = useCallback((slug: string) => {
    const fallbackSlug = categories.find((category) => category.slug !== slug)?.slug ?? "";
    void persist("category", "delete", { slug, fallbackSlug });
    setCategories((current) => {
      const remaining = current.filter((category) => category.slug !== slug);
      if (remaining.length) {
        const fallbackSlug = remaining[0].slug;
        setProducts((items) => items.map((product) => product.categorySlug === slug ? { ...product, categorySlug: fallbackSlug } : product));
      }
      return remaining;
    });
  }, [categories, persist]);
  const saveCoupon = useCallback((coupon: AdminCoupon) => {
    void persist("coupon", "upsert", coupon as unknown as Record<string, unknown>);
    setCoupons((current) => current.some((item) => item.id === coupon.id)
      ? current.map((item) => item.id === coupon.id ? coupon : item)
      : [coupon, ...current]);
  }, [persist]);
  const deleteCoupon = useCallback((id: string) => {
    void persist("coupon", "delete", { id });
    setCoupons((current) => current.filter((coupon) => coupon.id !== id));
  }, [persist]);
  const setBanners = useCallback((next: AdminBanner[]) => {
    for (const banner of next) void persist("banner", "upsert", banner as unknown as Record<string, unknown>);
    for (const old of banners) if (!next.some((banner) => banner.id === old.id)) void persist("banner", "delete", { id: old.id });
    setBannersState(next);
  }, [banners, persist]);
  const setSettings = useCallback((next: AdminSettings) => {
    void persist("settings", "upsert", next as unknown as Record<string, unknown>);
    setSettingsState(next);
  }, [persist]);
  const setContent = useCallback((next: AdminContent) => {
    for (const key of Object.keys(next) as AdminContentKey[]) {
      if (next[key] !== content[key]) void persist("content", "upsert", { slug: key, title: ({ about: "About Us", contact: "Contact Us", faq: "FAQ", privacy: "Privacy Policy", returns: "Return Policy", terms: "Terms & Conditions" })[key], body: next[key] });
    }
    setContentState(next);
  }, [content, persist]);

  const value = useMemo(() => ({
    ready, error, products, categories, sellers, coupons, banners, settings, content,
    saveProduct, deleteProduct, saveCategory, deleteCategory, saveCoupon, deleteCoupon,
    setBanners, setSettings, setContent,
  }), [ready, error, products, categories, sellers, coupons, banners, settings, content, saveProduct, deleteProduct, saveCategory, deleteCategory, saveCoupon, deleteCoupon, setBanners, setSettings, setContent]);

  return <AdminDataContext.Provider value={value}>
    {error && <div role="alert" className="fixed bottom-4 right-4 z-50 max-w-md rounded-2xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-lg">Database: {error}</div>}
    {children}
  </AdminDataContext.Provider>;
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) throw new Error("useAdminData must be used inside <AdminDataProvider>");
  return context;
}

export function createAdminProduct(input?: Partial<AdminProduct>): AdminProduct {
  const title = input?.title ?? "";
  const slug = input?.slug ?? title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const categorySlug = input?.categorySlug ?? fixtureCategories[0].slug;
  return {
    id: input?.id ?? `prd_${Date.now().toString(36)}`,
    slug,
    sku: input?.sku ?? "",
    title,
    shortDescription: input?.shortDescription ?? "",
    description: input?.description ?? "",
    categorySlug,
    sellerId: input?.sellerId ?? "sel_haatly",
    sourceType: input?.sourceType ?? "own_stock" satisfies SourceType,
    status: input?.status ?? "draft" satisfies ProductStatus,
    price: input?.price ?? 0,
    compareAtPrice: input?.compareAtPrice,
    stock: input?.stock ?? 0,
    lowStockThreshold: input?.lowStockThreshold ?? 5,
    preorderEta: input?.preorderEta,
    images: input?.images?.length ? input.images : ["/img/hero.png"],
    rating: input?.rating ?? 0,
    reviewCount: input?.reviewCount ?? 0,
    soldCount: input?.soldCount ?? 0,
    highlights: input?.highlights ?? [],
    specs: input?.specs ?? {},
    tags: input?.tags ?? [],
    createdAt: input?.createdAt ?? new Date().toISOString().slice(0, 10),
    paymentMethods: input?.paymentMethods ?? ["cod"],
  };
}
