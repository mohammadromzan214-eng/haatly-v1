"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { StockBadge } from "@/lib/types";
import { useCustomerAuth } from "./CustomerAuthProvider";

/* ---------------------------------------------------------------- Cart */

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  image: string;
  price: number;
  sellerId: string;
  sellerName: string;
  badge: StockBadge;
  preorderEta?: string;
  maxQty: number;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  wishlist: string[];
  toggleWish: (productId: string) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "haatly.cart.v1";
const WISH_KEY = "haatly.wishlist.v1";

/* --------------------------------------------------------------- Toast */

interface Toast { id: number; message: string }
const ToastContext = createContext<(message: string) => void>(() => {});

export function Providers({ children }: { children: React.ReactNode }) {
  const { customer, ready: authReady } = useCustomerAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!customer) {
      try {
        setWishlist(JSON.parse(localStorage.getItem(WISH_KEY) ?? "[]"));
      } catch {
        localStorage.removeItem(WISH_KEY);
        setWishlist([]);
      }
      return;
    }
    let active = true;
    fetch("/api/customer/wishlist", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json() as { wishlist?: string[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load wishlist.");
        if (active) setWishlist(result.wishlist ?? []);
      })
      .catch((error: unknown) => notify(error instanceof Error ? error.message : "Could not load wishlist."))
      .finally(() => { active = false; });
    return () => { active = false; };
  }, [customer, authReady]);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  useEffect(() => {
    if (ready && authReady && !customer) localStorage.setItem(WISH_KEY, JSON.stringify(wishlist));
  }, [wishlist, ready, authReady, customer]);

  const notify = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const add = useCallback<CartContextValue["add"]>((item, qty = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.productId === item.productId);
      if (existing) {
        return current.map((i) =>
          i.productId === item.productId ? { ...i, qty: Math.min(i.qty + qty, item.maxQty) } : i,
        );
      }
      return [...current, { ...item, qty: Math.min(qty, item.maxQty) }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setItems((current) =>
      current
        .map((i) => (i.productId === productId ? { ...i, qty: Math.max(0, Math.min(qty, i.maxQty)) } : i))
        .filter((i) => i.qty > 0),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((current) => current.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const toggleWish = useCallback(
    (productId: string) => {
      const adding = !wishlist.includes(productId);
      setWishlist((w) => (adding ? [...w, productId] : w.filter((id) => id !== productId)));
      if (customer) {
        const request = adding
          ? fetch("/api/customer/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ productId }) })
          : fetch(`/api/customer/wishlist?productId=${encodeURIComponent(productId)}`, { method: "DELETE", credentials: "same-origin" });
        void request.then(async (response) => {
          const result = await response.json() as { wishlist?: string[]; error?: string };
          if (!response.ok) throw new Error(result.error ?? "Could not update wishlist.");
          setWishlist(result.wishlist ?? []);
        }).catch((error: unknown) => notify(error instanceof Error ? error.message : "Could not update wishlist."));
      }
      return adding;
    },
    [wishlist, customer, notify],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.qty * i.price, 0),
      add,
      setQty,
      remove,
      clear,
      wishlist,
      toggleWish,
    }),
    [items, ready, add, setQty, remove, clear, wishlist, toggleWish],
  );

  return (
    <ToastContext.Provider value={notify}>
      <CartContext.Provider value={value}>
        {children}
        <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="animate-rise flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper shadow-[0_12px_40px_-12px_rgba(28,38,34,0.6)]"
            >
              <Check className="size-4 text-marigold" strokeWidth={2.5} />
              {t.message}
            </div>
          ))}
        </div>
      </CartContext.Provider>
    </ToastContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <Providers>");
  return ctx;
}

export function useToast() {
  return useContext(ToastContext);
}
