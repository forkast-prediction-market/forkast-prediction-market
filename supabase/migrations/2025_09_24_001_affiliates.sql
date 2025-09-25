-- ============================================================
-- AFFILIATE & FORK SETTINGS DOMAIN
-- ============================================================
-- Tables: fork_settings, affiliate_referrals
-- Column Alterations: users, orders
-- Business Logic: store affiliate configuration and attribution data
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

CREATE TABLE IF NOT EXISTS fork_settings
(
  id                   CHAR(26) PRIMARY KEY    DEFAULT generate_ulid(),
  singleton            BOOLEAN       NOT NULL  DEFAULT TRUE,
  trade_fee_bps        INTEGER       NOT NULL  DEFAULT 100,   -- 1.00%
  affiliate_share_bps  INTEGER       NOT NULL  DEFAULT 5000,  -- 50% of trade fees
  created_at           TIMESTAMPTZ              DEFAULT NOW(),
  updated_at           TIMESTAMPTZ              DEFAULT NOW(),
  CHECK (trade_fee_bps >= 0 AND trade_fee_bps <= 900),
  CHECK (affiliate_share_bps >= 0 AND affiliate_share_bps <= 10000)
);

DO
$$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fork_settings_singleton_unique'
        AND conrelid = 'fork_settings'::regclass
    ) THEN
      ALTER TABLE fork_settings
        ADD CONSTRAINT fork_settings_singleton_unique UNIQUE (singleton);
    END IF;
  END
$$;

-- Affiliate referral attribution table
CREATE TABLE IF NOT EXISTS affiliate_referrals
(
  id                 CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  user_id            CHAR(26) NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  affiliate_user_id  CHAR(26) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  source             TEXT,
  attributed_at      TIMESTAMPTZ        DEFAULT NOW()
);

-- ===========================================
-- 2. TABLE ALTERATIONS
-- ===========================================

-- Extend users table with affiliate data
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_user_id CHAR(26) REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_affiliate_code ON users (LOWER(affiliate_code));

-- Extend orders with captured fee breakdown
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_user_id CHAR(26) REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trade_fee_bps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_share_bps INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fork_fee_amount DECIMAL(20, 6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_fee_amount DECIMAL(20, 6) NOT NULL DEFAULT 0;

DO
$$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'orders_trade_fee_bps_check'
        AND conrelid = 'orders'::regclass
    ) THEN
      ALTER TABLE orders
        ADD CONSTRAINT orders_trade_fee_bps_check CHECK (trade_fee_bps >= 0 AND trade_fee_bps <= 1000);
    END IF;
  END
$$;

DO
$$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'orders_affiliate_share_bps_check'
        AND conrelid = 'orders'::regclass
    ) THEN
      ALTER TABLE orders
        ADD CONSTRAINT orders_affiliate_share_bps_check CHECK (affiliate_share_bps >= 0 AND affiliate_share_bps <= 10000);
    END IF;
  END
$$;

-- ===========================================
-- 3. ROW LEVEL SECURITY / POLICIES
-- ===========================================

ALTER TABLE fork_settings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE affiliate_referrals
  ENABLE ROW LEVEL SECURITY;

DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_fork_settings' AND tablename = 'fork_settings') THEN
      CREATE POLICY "service_role_all_fork_settings" ON fork_settings FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_affiliate_referrals' AND tablename = 'affiliate_referrals') THEN
      CREATE POLICY "service_role_all_affiliate_referrals" ON affiliate_referrals FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- ===========================================
-- 4. TRIGGERS
-- ===========================================

DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fork_settings_updated_at') THEN
      CREATE TRIGGER update_fork_settings_updated_at
        BEFORE UPDATE ON fork_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;

-- ===========================================
-- 5. FUNCTIONS
-- ===========================================

CREATE OR REPLACE FUNCTION get_affiliate_stats(target_user_id CHAR(26))
  RETURNS TABLE (
    total_referrals BIGINT,
    active_referrals BIGINT,
    total_volume NUMERIC,
    total_affiliate_fees NUMERIC,
    total_fork_fees NUMERIC
  )
  LANGUAGE SQL
  STABLE
  SET search_path = public
AS
$$
  SELECT
    COALESCE((SELECT COUNT(*) FROM affiliate_referrals ar WHERE ar.affiliate_user_id = target_user_id), 0) AS total_referrals,
    COALESCE((
      SELECT COUNT(DISTINCT o.user_id)
      FROM orders o
      WHERE o.affiliate_user_id = target_user_id
        AND o.status != 'cancelled'
    ), 0) AS active_referrals,
    COALESCE((
      SELECT SUM(o.amount)
      FROM orders o
      WHERE o.affiliate_user_id = target_user_id
        AND o.status != 'cancelled'
    ), 0) AS total_volume,
    COALESCE((
      SELECT SUM(o.affiliate_fee_amount)
      FROM orders o
      WHERE o.affiliate_user_id = target_user_id
        AND o.status != 'cancelled'
    ), 0) AS total_affiliate_fees,
    COALESCE((
      SELECT SUM(o.fork_fee_amount)
      FROM orders o
      WHERE o.affiliate_user_id = target_user_id
        AND o.status != 'cancelled'
    ), 0) AS total_fork_fees;
$$;

CREATE OR REPLACE FUNCTION get_affiliate_overview()
  RETURNS TABLE (
    affiliate_user_id CHAR(26),
    total_referrals BIGINT,
    total_volume NUMERIC,
    total_affiliate_fees NUMERIC
  )
  LANGUAGE SQL
  STABLE
  SET search_path = public
AS
$$
  SELECT
    u.id AS affiliate_user_id,
    COALESCE(ar.count_referrals, 0) AS total_referrals,
    COALESCE(ord.total_volume, 0) AS total_volume,
    COALESCE(ord.total_affiliate_fees, 0) AS total_affiliate_fees
  FROM users u
  LEFT JOIN (
    SELECT affiliate_user_id, COUNT(*) AS count_referrals
    FROM affiliate_referrals
    GROUP BY affiliate_user_id
  ) ar ON ar.affiliate_user_id = u.id
  LEFT JOIN (
    SELECT
      affiliate_user_id,
      SUM(CASE WHEN status != 'cancelled' THEN amount ELSE 0 END) AS total_volume,
      SUM(CASE WHEN status != 'cancelled' THEN affiliate_fee_amount ELSE 0 END) AS total_affiliate_fees
    FROM orders
    WHERE affiliate_user_id IS NOT NULL
    GROUP BY affiliate_user_id
  ) ord ON ord.affiliate_user_id = u.id
  WHERE ar.count_referrals IS NOT NULL OR ord.total_volume IS NOT NULL;
$$;

-- ===========================================
-- 6. SEED DATA
-- ===========================================

INSERT INTO fork_settings (singleton, trade_fee_bps, affiliate_share_bps)
VALUES (TRUE, 100, 5000)
ON CONFLICT (singleton) DO UPDATE SET
  trade_fee_bps = EXCLUDED.trade_fee_bps,
  affiliate_share_bps = EXCLUDED.affiliate_share_bps;
