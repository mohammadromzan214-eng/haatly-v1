ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_sub TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email',
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
  ON users(google_sub)
  WHERE google_sub IS NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_auth_provider_check
    CHECK (auth_provider IN ('email', 'google')),
  ADD CONSTRAINT users_auth_credentials_check
    CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

UPDATE orders
SET payment_method = CASE lower(btrim(payment_method))
  WHEN 'cash on delivery' THEN 'cod'
  WHEN 'cod' THEN 'cod'
  WHEN 'bkash' THEN 'bkash'
  WHEN 'nagad' THEN 'nagad'
  ELSE payment_method
END;

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL REFERENCES orders(code) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('cod', 'bkash', 'nagad', 'legacy')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT',
  transaction_reference TEXT,
  provider_transaction_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'rejected')),
  verification_note TEXT NOT NULL DEFAULT '',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  provider_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_status_created_idx ON payments(status, created_at DESC);
CREATE INDEX payments_order_code_idx ON payments(order_code);

INSERT INTO payments (id, order_code, provider, status, amount, currency, transaction_reference, created_at)
SELECT
  'legacy_' || code,
  code,
  CASE payment_method
    WHEN 'cod' THEN 'cod'
    WHEN 'bkash' THEN 'bkash'
    WHEN 'nagad' THEN 'nagad'
    ELSE 'legacy'
  END,
  payment_status,
  COALESCE(NULLIF(total, 0), (
    SELECT COALESCE(SUM(item.quantity * item.unit_price), 0)
    FROM order_items AS item
    WHERE item.order_code = orders.code
  ) + delivery_fee - discount),
  'BDT',
  payment_reference,
  placed_at
FROM orders
ON CONFLICT (id) DO NOTHING;

UPDATE products
SET payment_methods = COALESCE((
  SELECT jsonb_agg(method ORDER BY method)
  FROM (
    SELECT DISTINCT CASE lower(method)
      WHEN 'cash on delivery' THEN 'cod'
      WHEN 'cod' THEN 'cod'
      WHEN 'bkash' THEN 'bkash'
      WHEN 'nagad' THEN 'nagad'
      ELSE NULL
    END AS method
    FROM jsonb_array_elements_text(products.payment_methods) AS payment_method(method)
  ) AS normalized
  WHERE method IS NOT NULL
), '[]'::jsonb);
