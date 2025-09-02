-- ============================================================
-- ORDERS - Minimal Order Storage System
-- ============================================================
-- Tables: orders
-- Dependencies: users, outcomes, conditions, markets
-- Business Logic: Basic order insertion and storage
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

-- Orders table - Basic order storage
CREATE TABLE IF NOT EXISTS orders
(
  id            CHAR(26) PRIMARY KEY    DEFAULT generate_ulid(),
  user_id       CHAR(26)       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  condition_id  VARCHAR(66)    NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  outcome_index SMALLINT       NOT NULL,
  order_type    VARCHAR(10)    NOT NULL,                   -- 'market', 'limit'
  side          VARCHAR(4)     NOT NULL,                   -- 'buy', 'sell'
  amount        DECIMAL(20, 6) NOT NULL,                   -- Amount to buy/sell
  price         DECIMAL(4, 4),                             -- Limit price (0.0001 to 0.9999)
  status        VARCHAR(20)    NOT NULL DEFAULT 'pending', -- 'pending', 'filled', 'cancelled'
  created_at    TIMESTAMPTZ             DEFAULT NOW(),
  updated_at    TIMESTAMPTZ             DEFAULT NOW(),

  -- Constraints
  CHECK (order_type IN ('market', 'limit')),
  CHECK (side IN ('buy', 'sell')),
  CHECK (status IN ('pending', 'filled', 'cancelled')),
  CHECK (amount > 0),
  CHECK (price IS NULL OR (price >= 0.0001 AND price <= 0.9999)),
  FOREIGN KEY (condition_id, outcome_index) REFERENCES outcomes (condition_id, outcome_index)
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

-- Orders indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_condition ON orders (condition_id, outcome_index);
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
CREATE POLICY "service_role_all_orders" ON orders
  FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ===========================================
-- 5. TRIGGERS
-- ===========================================

-- Updated_at trigger for orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE
  ON orders
  FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
