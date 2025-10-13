BEGIN;

-- ============================================================
-- ORDERS - Minimal Order Storage System
-- ============================================================
-- Tables: orders (with affiliate fee columns)
-- Dependencies: users, outcomes, conditions, markets
-- Business Logic: Basic order insertion and storage with affiliate fee tracking
-- Consolidation: Includes affiliate fee columns (affiliate_user_id, trade_fee_bps, affiliate_share_bps, fork_fee_amount, affiliate_fee_amount)
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

-- Orders table - Basic order storage with affiliate fee tracking
CREATE TABLE IF NOT EXISTS orders
(
  id                   CHAR(26) PRIMARY KEY    DEFAULT generate_ulid(),
  user_id              CHAR(26)       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  condition_id         VARCHAR(66)    NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  token_id             TEXT           NOT NULL REFERENCES outcomes (token_id) ON DELETE CASCADE,
  type                 VARCHAR(10)    NOT NULL,                                 -- 'market', 'limit'
  side                 VARCHAR(4)     NOT NULL,                                 -- 'buy', 'sell'
  amount               DECIMAL(20, 6) NOT NULL,                                 -- Amount to buy/sell
  price                DECIMAL(4, 4),                                           -- Limit price (0.0001 to 0.9999)
  status               VARCHAR(20)    NOT NULL DEFAULT 'pending',               -- 'pending', 'filled', 'cancelled'
  affiliate_user_id    CHAR(26)       REFERENCES users (id) ON DELETE SET NULL, -- Affiliate who gets commission
  trade_fee_bps        INTEGER        NOT NULL DEFAULT 0,                       -- Trading fee in basis points
  affiliate_share_bps  INTEGER        NOT NULL DEFAULT 0,                       -- Affiliate's share of fees in basis points
  fork_fee_amount      DECIMAL(20, 6) NOT NULL DEFAULT 0,                       -- Fork fee amount
  affiliate_fee_amount DECIMAL(20, 6) NOT NULL DEFAULT 0,                       -- Affiliate commission amount
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (type IN ('market', 'limit')),
  CHECK (side IN ('buy', 'sell')),
  CHECK (status IN ('pending', 'filled', 'cancelled')),
  CHECK (amount > 0),
  CHECK (price IS NULL OR (price >= 0.0001 AND price <= 0.9999)),
  CHECK (trade_fee_bps >= 0 AND trade_fee_bps <= 1000),
  CHECK (affiliate_share_bps >= 0 AND affiliate_share_bps <= 10000)
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

-- Orders indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_condition ON orders (condition_id, token_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

-- ===========================================
-- 3. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on orders table
ALTER TABLE orders
  ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. SECURITY POLICIES
-- ===========================================

-- Orders policies - Service role only (authentication handled at API level)
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_orders'
                     AND tablename = 'orders') THEN
      CREATE POLICY "service_role_all_orders" ON orders FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- ===========================================
-- 5. TRIGGERS
-- ===========================================

-- Updated_at trigger for orders
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at') THEN
      CREATE TRIGGER update_orders_updated_at
        BEFORE UPDATE
        ON orders
        FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;

-- ===========================================
-- 6. Functions
-- ===========================================

CREATE OR REPLACE FUNCTION get_event_top_holders(
  event_slug_arg TEXT,
  condition_id_arg TEXT DEFAULT NULL,
  limit_arg INTEGER DEFAULT 15
)
  RETURNS TABLE
          (
            user_id       TEXT,
            username      TEXT,
            address       TEXT,
            image         TEXT,
            outcome_index INTEGER,
            outcome_text  TEXT,
            net_position  NUMERIC
          )
  LANGUAGE SQL
  STABLE
AS
$$
WITH event_orders AS (
  -- Get all filled orders for the specific event, optionally filtered by condition_id
  SELECT o.user_id,
         o.side,
         o.amount,
         out.outcome_index,
         out.outcome_text,
         u.username,
         u.address,
         u.image
  FROM orders o
         JOIN outcomes out ON o.token_id = out.token_id
         JOIN conditions c ON out.condition_id = c.id
         JOIN markets m ON c.id = m.condition_id
         JOIN events e ON m.event_id = e.id
         JOIN users u ON o.user_id = u.id
  WHERE e.slug = event_slug_arg
    AND o.status IN ('filled', 'pending')
    AND (condition_id_arg IS NULL OR c.id = condition_id_arg)),
     user_positions AS (
       -- Calculate net positions per user per outcome
       SELECT user_id,
              username,
              address,
              image,
              outcome_index,
              outcome_text,
              SUM(
                CASE
                  WHEN side = 'buy' THEN amount
                  ELSE -amount
                  END
              ) AS net_position
       FROM event_orders
       GROUP BY user_id, username, address, image, outcome_index, outcome_text
       HAVING SUM(
                CASE
                  WHEN side = 'buy' THEN amount
                  ELSE -amount
                  END
              ) > 0),
     ranked_positions AS (
       -- Rank positions within each outcome
       SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY outcome_index
                ORDER BY net_position DESC
                ) AS rank
       FROM user_positions)
-- Return top holders for each outcome
SELECT user_id,
       username,
       address,
       image,
       outcome_index,
       outcome_text,
       net_position
FROM ranked_positions
WHERE rank <= limit_arg
ORDER BY outcome_index, net_position DESC;
$$;

COMMIT;
