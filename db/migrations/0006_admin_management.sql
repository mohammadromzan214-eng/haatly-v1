ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS sellers_kind_active_idx ON sellers(kind, active);
CREATE INDEX IF NOT EXISTS users_customer_active_idx ON users(role, is_active, created_at DESC);
