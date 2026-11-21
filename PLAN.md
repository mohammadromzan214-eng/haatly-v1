# Haatly — Build Plan

## 1. Storefront foundation — DONE
Next.js App Router project, brand system, AI-generated product photography (served via Netlify Image CDN), marketplace-shaped domain types (`src/lib/types.ts`), stub catalogue (`src/lib/fixtures.ts`) behind a read layer (`src/lib/catalog.ts`).
Live: `/`, `/products`, `/products/[slug]`, `/products/category/[category]`, `/cart` (browser-persisted, grouped by seller, coupon HAAT10), `/track-order` (7-step workflow), `/admin/inventory` (source type, status, stock badge, low-stock rules — client-side only).

## 2. Database — FOUNDATION IMPLEMENTED
PostgreSQL schema, migrations, fixture seeds and storage repositories are in place. Tables include sellers (kind platform/partner/marketplace, commission_rate), users (role customer/admin/seller, email or Google identity), addresses, categories, products (seller_id, source_type, status, stock and payment-method choices), wishlists, orders, payments, seller_orders (per-seller sub-orders), order_items, order_events, coupons, banners, content pages and business settings. Admin catalogue/inventory management, customer profiles/addresses/wishlist/orders, payment verification, and public storefront reads use database repositories. Public product, category, seller, banner, coupon, content and business-setting changes are read dynamically so admin updates appear on the next storefront request. Configure `DATABASE_URL`, then run `npm run db:migrate` and `npm run db:seed`. Payouts, withdrawals and commission ledger are not implemented.

## 3. Auth & customer dashboard — EMAIL + GOOGLE CUSTOMER AUTH
`/login`, `/register`, `/forgot-password`, `/reset-password`, `/profile`, `/profile/orders`, `/profile/order/[id]`, `/profile/wishlist`, `/profile/addresses`, and `/profile/edit-profile` exist. Customer accounts use signed-cookie sessions and database-backed records, with email/password and Google OIDC registration/login. Password recovery sends expiring, single-use links by email; customer order details load the owner's saved items, payment, delivery address, and tracking events from PostgreSQL. Configure a production `CUSTOMER_AUTH_SECRET`, Resend email settings, and Google OAuth credentials before enabling the related features in deployment. Admin sign-in requires `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_AUTH_SECRET`; there are no built-in credentials or signing-secret fallbacks. Full admin identity management and database-backed roles remain future hardening work.

## 4. Checkout & payments — GUEST COD + MOCK BKASH/NAGAD
`/checkout` supports guests and signed-in customers without requiring an account. It validates delivery and optional billing addresses, places orders transactionally, reserves stock, stores order snapshots/totals/notes, and creates seller sub-orders with commission snapshots. Product payment methods are enforced both at checkout and on the server. Guest COD works without login; signed-in customers may choose COD, bKash or Nagad when every cart item permits it. Payment records support pending/paid/failed/refunded states, with an admin verification screen. bKash and Nagad currently use explicit mock providers and remain pending until admin verification; live gateway APIs, callbacks/webhooks, refunds, and reconciliation remain TODO. New orders are available through mobile/order-number tracking.

## 5. Admin console — CATALOGUE + PAYMENT MANAGEMENT
Products list/add/edit/delete, inventory, categories, banners/offers, content pages, coupons, business settings and payment verification use the database storage layer. Public storefront pages now reflect these database-managed products, categories, active banners/coupons, published CMS pages, store contact details, and product-level payment method choices on the next request. Partner-shop management remains admin-only and planned. Admin dashboard metrics, orders/status management and customer management remain.

## 6. Remaining public pages — TODO
Database-published `/about`, `/contact`, `/faq`, `/privacy-policy`, `/return-policy`, and `/terms-and-conditions` pages use the shared CMS route. Dedicated `/search`, `/offers`, and `/categories` pages and Netlify Forms for contact remain TODO.

## 7. Marketplace — FUTURE
Seller registration/dashboard/products/orders, withdraw requests, commission system; public JSON API for Android/iOS apps.
