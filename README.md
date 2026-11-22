# Haatly

A Bangladeshi multi-page e-commerce platform built with Next.js (App Router), React 19, Tailwind CSS v4, and PostgreSQL-backed management storage. It runs on any hosting provider that supports a Node.js server; no Netlify runtime or image service is required. Customer email auth and Google OIDC are available; admin sign-in requires deployment-configured credentials and a signing secret. Designed to grow from a single-vendor store into a multi-vendor marketplace.

## Run locally
```
npm install
npm run dev
```
Open `http://localhost:3000`.

## Deploy to a Node.js host
Use Node.js 20.9 or newer. Configure the required environment variables for your deployment, then run:
```
npm ci
npm run build
npm run start
```
The server listens on port `3000` by default and respects the hosting provider's `PORT` environment variable. This standard Next.js Node.js server can be used on any compatible host; `netlify.toml` is only for optional Netlify deployments.

## Database setup
Set `DATABASE_URL` to a PostgreSQL connection string, then run:
```
npm run db:migrate
npm run db:seed
```
Migration SQL lives in `db/migrations/`; development seed SQL lives in `db/seeds/`, and catalogue/order fixtures are loaded by `scripts/db-seed-fixtures.ts`. Customer/admin management, guest checkout, and the public storefront require the database to be configured and migrated. The storefront reads products, categories, banners, coupons, published content pages, sellers, and business contact settings directly from PostgreSQL; public pages are rendered dynamically so admin changes appear on the next request. Checkout remains available to guests with Cash on Delivery. Signed-in customers can also select bKash or Nagad when every product in the cart permits that method. Until live gateway adapters are configured, bKash/Nagad use a mock provider and remain pending for manual verification in Admin → Payments; no mock transaction is automatically marked paid. Orders and payment records preserve seller grouping and commission snapshots.

Google customer sign-in/registration uses OAuth 2.0 Authorization Code + PKCE and verified Google ID tokens. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `CUSTOMER_AUTH_SECRET` (at least 32 random characters) in production. Set `APP_BASE_URL` to the canonical site origin, or set `GOOGLE_REDIRECT_URI` to the exact callback URL registered in Google Cloud:
`https://<your-domain>/api/customer/oauth/google/callback`
Without Google credentials, email login/registration and guest checkout continue to work. Customer sessions require the configured signing secret in production.

## Password reset email
Password recovery uses the Resend email API. Configure `RESEND_API_KEY`, `EMAIL_FROM` (a sender address verified with Resend), and the HTTPS origin in `APP_BASE_URL`. Apply database migrations with `npm run db:migrate` to create the hashed, expiring, single-use reset-token table. Reset links expire after 30 minutes. The request response does not reveal whether an account exists; delivery failures are logged and undelivered tokens are revoked. The application request limiter is per instance, so configure deployment-level rate limiting for `/api/customer/forgot-password` and `/api/customer/reset-password`.

## Admin authentication
Admin sign-in has no built-in credentials or signing-secret fallback. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), and `ADMIN_AUTH_SECRET` (at least 32 random characters) in `.env.local` for development and in the deployment environment for production. Do not commit these values or display them in the application. Generate a signing secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Requests fail closed when any value is missing or invalid. The application limiter is per instance; also configure deployment-level rate limiting for `/api/admin/login`.

## Roadmap
See [PLAN.md](PLAN.md): payment gateway integration and full admin/customer identity management, remaining public pages, then seller marketplace and mobile API.
