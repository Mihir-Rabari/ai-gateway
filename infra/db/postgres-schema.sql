-- ═══════════════════════════════════════════════════════════════
-- AI Gateway — PostgreSQL Schema
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────
-- Users
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  plan_id         TEXT NOT NULL DEFAULT 'free',
  credit_balance  INTEGER NOT NULL DEFAULT 100,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ──────────────────────────────────────────────
-- Subscriptions
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                  TEXT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending',
  razorpay_subscription_id TEXT UNIQUE,
  razorpay_customer_id     TEXT,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_id ON subscriptions (razorpay_subscription_id);

-- ──────────────────────────────────────────────
-- Credit Transactions
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       INTEGER NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  reason       TEXT NOT NULL CHECK (reason IN ('request', 'subscription', 'refund', 'admin')),
  request_id   UUID,
  balance_after INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_txn_user_id ON credit_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_txn_created_at ON credit_transactions (created_at DESC);

-- ──────────────────────────────────────────────
-- Registered Apps (Developer Apps)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registered_apps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  api_key      TEXT UNIQUE NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_developer_id ON registered_apps (developer_id);
CREATE INDEX IF NOT EXISTS idx_apps_api_key ON registered_apps (api_key);

-- ──────────────────────────────────────────────
-- Developer Wallets
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dev_wallets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance      NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12, 4) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- Dev Wallet Transactions
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dev_wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          UUID NOT NULL REFERENCES registered_apps(id),
  request_id      UUID NOT NULL,
  credits_earned  INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_dev_wallet_txn_app_id ON dev_wallet_transactions (app_id);

-- ──────────────────────────────────────────────
-- Trigger: Update updated_at automatically
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON registered_apps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dev_wallets_updated_at BEFORE UPDATE ON dev_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
