-- ============================================================
-- ORDERS & TRADING - Complete Domain Implementation
-- ============================================================
-- Tables: user_balances, user_positions, orders, trades, order_fills, fee_ledger
-- Views: v_user_portfolio, v_order_book
-- Dependencies: users, outcomes, conditions, markets
-- Business Logic: Order matching, position management, fee distribution
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

-- User balances table - Tracks cash/token balances for trading
CREATE TABLE IF NOT EXISTS user_balances (
  id                   CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  user_id              CHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  available_balance    DECIMAL(20, 6) NOT NULL DEFAULT 0,
  locked_balance       DECIMAL(20, 6) NOT NULL DEFAULT 0, -- For pending orders
  total_balance        DECIMAL(20, 6) NOT NULL DEFAULT 0,
  last_updated         TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (available_balance >= 0),
  CHECK (locked_balance >= 0),
  CHECK (total_balance >= 0),
  CHECK (total_balance = available_balance + locked_balance),
  UNIQUE (user_id)
);

-- User positions table - Tracks share positions in outcomes
CREATE TABLE IF NOT EXISTS user_positions (
  id                   CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  user_id              CHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition_id         VARCHAR(66) NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  outcome_index        SMALLINT NOT NULL,
  outcome_token_id     TEXT NOT NULL, -- ERC1155 token ID
  shares_owned         DECIMAL(20, 6) NOT NULL DEFAULT 0,
  average_cost_basis   DECIMAL(20, 6), -- Average price paid per share
  total_cost_basis     DECIMAL(20, 6), -- Total amount invested
  realized_pnl         DECIMAL(20, 6) DEFAULT 0, -- Profit/Loss from closed positions
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (shares_owned >= 0),
  CHECK (outcome_index >= 0),
  UNIQUE (user_id, condition_id, outcome_index),
  FOREIGN KEY (condition_id, outcome_index) REFERENCES outcomes(condition_id, outcome_index)
);

-- Orders table - Pending orders (both buy and sell)
CREATE TABLE IF NOT EXISTS orders (
  id                   CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  user_id              CHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition_id         VARCHAR(66) NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  outcome_index        SMALLINT NOT NULL,
  order_type           VARCHAR(10) NOT NULL, -- 'market', 'limit'
  side                 VARCHAR(4) NOT NULL,  -- 'buy', 'sell'
  amount               DECIMAL(20, 6) NOT NULL, -- Shares for sell, dollars for buy
  price                DECIMAL(8, 4), -- Limit price in cents (0.0001 to 0.9999)
  status               VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'partial', 'filled', 'cancelled'
  filled_amount        DECIMAL(20, 6) NOT NULL DEFAULT 0,
  remaining_amount     DECIMAL(20, 6) NOT NULL,
  expires_at           TIMESTAMPTZ, -- For GTD orders
  blockchain_tx_hash   VARCHAR(66), -- For on-chain settlement
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (order_type IN ('market', 'limit')),
  CHECK (side IN ('buy', 'sell')),
  CHECK (status IN ('pending', 'partial', 'filled', 'cancelled', 'expired')),
  CHECK (amount > 0),
  CHECK (filled_amount >= 0),
  CHECK (remaining_amount >= 0),
  CHECK (remaining_amount <= amount),
  CHECK (price IS NULL OR (price >= 0.0001 AND price <= 0.9999)),
  CHECK (expires_at IS NULL OR expires_at > created_at),
  FOREIGN KEY (condition_id, outcome_index) REFERENCES outcomes(condition_id, outcome_index)
);

-- Trades table - Executed trades
CREATE TABLE IF NOT EXISTS trades (
  id                   CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  maker_order_id       CHAR(26) REFERENCES orders(id) ON DELETE SET NULL,
  taker_order_id       CHAR(26) REFERENCES orders(id) ON DELETE SET NULL,
  condition_id         VARCHAR(66) NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  outcome_index        SMALLINT NOT NULL,
  maker_user_id        CHAR(26) NOT NULL REFERENCES users(id),
  taker_user_id        CHAR(26) NOT NULL REFERENCES users(id),
  side                 VARCHAR(4) NOT NULL, -- 'buy' from maker's perspective
  shares_traded        DECIMAL(20, 6) NOT NULL,
  price_per_share      DECIMAL(8, 4) NOT NULL, -- In cents
  total_value          DECIMAL(20, 6) NOT NULL,
  platform_fee         DECIMAL(20, 6) NOT NULL DEFAULT 0, -- 1% platform fee
  protocol_fee         DECIMAL(20, 6) NOT NULL DEFAULT 0, -- 1% protocol fee
  blockchain_tx_hash   VARCHAR(66),
  executed_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (side IN ('buy', 'sell')),
  CHECK (shares_traded > 0),
  CHECK (price_per_share >= 0.0001 AND price_per_share <= 0.9999),
  CHECK (total_value > 0),
  CHECK (platform_fee >= 0),
  CHECK (protocol_fee >= 0),
  CHECK (maker_user_id != taker_user_id),
  FOREIGN KEY (condition_id, outcome_index) REFERENCES outcomes(condition_id, outcome_index)
);

-- Order fills table - Individual fills of orders (for partial fills)
CREATE TABLE IF NOT EXISTS order_fills (
  id                   CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  order_id             CHAR(26) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  trade_id             CHAR(26) NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  filled_amount        DECIMAL(20, 6) NOT NULL,
  fill_price           DECIMAL(8, 4) NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (filled_amount > 0),
  CHECK (fill_price >= 0.0001 AND fill_price <= 0.9999),
  UNIQUE (order_id, trade_id)
);

-- Fee ledger table - Platform and protocol fee tracking
CREATE TABLE IF NOT EXISTS fee_ledger (
  id                   CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  trade_id             CHAR(26) NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  fee_type             VARCHAR(10) NOT NULL, -- 'platform', 'protocol'
  amount               DECIMAL(20, 6) NOT NULL,
  recipient_address    TEXT NOT NULL, -- Platform or protocol wallet
  distributed_at       TIMESTAMPTZ,
  blockchain_tx_hash   VARCHAR(66),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (fee_type IN ('platform', 'protocol')),
  CHECK (amount > 0)
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

-- User balances indexes
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances (user_id);

-- User positions indexes
CREATE INDEX IF NOT EXISTS idx_user_positions_user_id ON user_positions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_condition ON user_positions (condition_id, outcome_index);
CREATE INDEX IF NOT EXISTS idx_user_positions_token ON user_positions (outcome_token_id);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_condition ON orders (condition_id, outcome_index);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_side ON orders (side);
CREATE INDEX IF NOT EXISTS idx_orders_expires ON orders (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

-- Trades indexes
CREATE INDEX IF NOT EXISTS idx_trades_condition ON trades (condition_id, outcome_index);
CREATE INDEX IF NOT EXISTS idx_trades_users ON trades (maker_user_id, taker_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades (executed_at);
CREATE INDEX IF NOT EXISTS idx_trades_tx_hash ON trades (blockchain_tx_hash);

-- Order fills indexes
CREATE INDEX IF NOT EXISTS idx_order_fills_order_id ON order_fills (order_id);
CREATE INDEX IF NOT EXISTS idx_order_fills_trade_id ON order_fills (trade_id);

-- Fee ledger indexes
CREATE INDEX IF NOT EXISTS idx_fee_ledger_trade_id ON fee_ledger (trade_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_type ON fee_ledger (fee_type);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_recipient ON fee_ledger (recipient_address);

-- ===========================================
-- 3. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all orders and trading tables
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_ledger ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. SECURITY POLICIES
-- ===========================================

-- Since this project uses Better Auth (not Supabase auth), authentication is handled
-- at the application level. We only need service_role policies for internal operations.

-- User balances policies - Service role only (authentication handled at API level)
CREATE POLICY "service_role_all_user_balances" ON user_balances 
  FOR ALL TO service_role 
  USING (TRUE) WITH CHECK (TRUE);

-- User positions policies - Service role only (authentication handled at API level)
CREATE POLICY "service_role_all_user_positions" ON user_positions 
  FOR ALL TO service_role 
  USING (TRUE) WITH CHECK (TRUE);

-- Orders policies - Service role only (authentication handled at API level)
CREATE POLICY "service_role_all_orders" ON orders 
  FOR ALL TO service_role 
  USING (TRUE) WITH CHECK (TRUE);

-- Trades policies - Service role only (authentication handled at API level)
CREATE POLICY "service_role_all_trades" ON trades 
  FOR ALL TO service_role 
  USING (TRUE) WITH CHECK (TRUE);

-- Order fills policies - Service role only (authentication handled at API level)
CREATE POLICY "service_role_all_order_fills" ON order_fills 
  FOR ALL TO service_role 
  USING (TRUE) WITH CHECK (TRUE);

-- Fee ledger policies - Service role only (internal use)
CREATE POLICY "service_role_all_fee_ledger" ON fee_ledger 
  FOR ALL TO service_role 
  USING (TRUE) WITH CHECK (TRUE);

-- ===========================================
-- 5. BUSINESS LOGIC FUNCTIONS
-- ===========================================

-- Function to update user balance
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id CHAR(26),
  p_amount_change DECIMAL(20, 6)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO user_balances (user_id, available_balance, total_balance)
  VALUES (p_user_id, GREATEST(0, p_amount_change), GREATEST(0, p_amount_change))
  ON CONFLICT (user_id)
  DO UPDATE SET
    available_balance = GREATEST(0, user_balances.available_balance + p_amount_change),
    total_balance = GREATEST(0, user_balances.total_balance + p_amount_change),
    updated_at = NOW();
END;
$$;

-- Function to lock/unlock balance for orders
CREATE OR REPLACE FUNCTION lock_user_balance(
  p_user_id CHAR(26),
  p_amount DECIMAL(20, 6)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  available_amt DECIMAL(20, 6);
BEGIN
  -- Get current available balance
  SELECT available_balance INTO available_amt
  FROM user_balances
  WHERE user_id = p_user_id;
  
  -- Check if sufficient balance
  IF available_amt IS NULL OR available_amt < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Lock the balance
  UPDATE user_balances
  SET available_balance = available_balance - p_amount,
      locked_balance = locked_balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Function to unlock balance (when order is cancelled/filled)
CREATE OR REPLACE FUNCTION unlock_user_balance(
  p_user_id CHAR(26),
  p_amount DECIMAL(20, 6)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE user_balances
  SET available_balance = available_balance + p_amount,
      locked_balance = GREATEST(0, locked_balance - p_amount),
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Function to update user position
CREATE OR REPLACE FUNCTION update_user_position(
  p_user_id CHAR(26),
  p_condition_id VARCHAR(66),
  p_outcome_index SMALLINT,
  p_token_id TEXT,
  p_shares_change DECIMAL(20, 6),
  p_price_per_share DECIMAL(8, 4) DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_shares DECIMAL(20, 6);
  current_cost_basis DECIMAL(20, 6);
  new_total_cost DECIMAL(20, 6);
BEGIN
  -- Get current position
  SELECT shares_owned, total_cost_basis INTO current_shares, current_cost_basis
  FROM user_positions
  WHERE user_id = p_user_id 
    AND condition_id = p_condition_id 
    AND outcome_index = p_outcome_index;
  
  current_shares := COALESCE(current_shares, 0);
  current_cost_basis := COALESCE(current_cost_basis, 0);
  
  -- Calculate new position
  IF current_shares + p_shares_change = 0 THEN
    -- Remove position if zero
    DELETE FROM user_positions
    WHERE user_id = p_user_id 
      AND condition_id = p_condition_id 
      AND outcome_index = p_outcome_index;
  ELSE
    -- Calculate new cost basis
    IF p_price_per_share IS NOT NULL AND p_shares_change > 0 THEN
      -- Buying shares: update average cost basis
      new_total_cost := current_cost_basis + (p_shares_change * p_price_per_share);
      INSERT INTO user_positions (
        user_id, condition_id, outcome_index, outcome_token_id,
        shares_owned, total_cost_basis, average_cost_basis
      ) VALUES (
        p_user_id, p_condition_id, p_outcome_index, p_token_id,
        current_shares + p_shares_change,
        new_total_cost,
        new_total_cost / (current_shares + p_shares_change)
      )
      ON CONFLICT (user_id, condition_id, outcome_index)
      DO UPDATE SET
        shares_owned = user_positions.shares_owned + p_shares_change,
        total_cost_basis = user_positions.total_cost_basis + (p_shares_change * p_price_per_share),
        average_cost_basis = (user_positions.total_cost_basis + (p_shares_change * p_price_per_share)) / (user_positions.shares_owned + p_shares_change),
        updated_at = NOW();
    ELSE
      -- Selling shares: just update quantity
      UPDATE user_positions
      SET shares_owned = shares_owned + p_shares_change,
          updated_at = NOW()
      WHERE user_id = p_user_id 
        AND condition_id = p_condition_id 
        AND outcome_index = p_outcome_index;
    END IF;
  END IF;
END;
$$;

-- Function to execute a trade
CREATE OR REPLACE FUNCTION execute_trade(
  p_maker_order_id CHAR(26),
  p_taker_order_id CHAR(26),
  p_shares_traded DECIMAL(20, 6),
  p_price_per_share DECIMAL(8, 4)
)
RETURNS CHAR(26)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  maker_order orders;
  taker_order orders;
  trade_id CHAR(26);
  total_value DECIMAL(20, 6);
  platform_fee DECIMAL(20, 6);
  protocol_fee DECIMAL(20, 6);
BEGIN
  -- Get order details
  SELECT * INTO maker_order FROM orders WHERE id = p_maker_order_id;
  SELECT * INTO taker_order FROM orders WHERE id = p_taker_order_id;
  
  IF maker_order.side = taker_order.side THEN
    RAISE EXCEPTION 'Cannot match orders with same side';
  END IF;
  
  -- Calculate values
  total_value := p_shares_traded * p_price_per_share;
  platform_fee := total_value * 0.01;  -- 1% platform fee
  protocol_fee := total_value * 0.01;  -- 1% protocol fee
  
  -- Create trade record
  INSERT INTO trades (
    maker_order_id, taker_order_id, condition_id, outcome_index,
    maker_user_id, taker_user_id, side, shares_traded, 
    price_per_share, total_value, platform_fee, protocol_fee
  ) VALUES (
    p_maker_order_id, p_taker_order_id, maker_order.condition_id, maker_order.outcome_index,
    maker_order.user_id, taker_order.user_id, maker_order.side, p_shares_traded,
    p_price_per_share, total_value, platform_fee, protocol_fee
  ) RETURNING id INTO trade_id;
  
  -- Create fill records
  INSERT INTO order_fills (order_id, trade_id, filled_amount, fill_price)
  VALUES (p_maker_order_id, trade_id, p_shares_traded, p_price_per_share);
  
  INSERT INTO order_fills (order_id, trade_id, filled_amount, fill_price)
  VALUES (p_taker_order_id, trade_id, p_shares_traded, p_price_per_share);
  
  -- Update order statuses
  UPDATE orders 
  SET filled_amount = filled_amount + p_shares_traded,
      remaining_amount = remaining_amount - p_shares_traded,
      status = CASE 
        WHEN remaining_amount - p_shares_traded <= 0 THEN 'filled'
        ELSE 'partial'
      END,
      updated_at = NOW()
  WHERE id IN (p_maker_order_id, p_taker_order_id);
  
  -- Update user positions and balances
  IF maker_order.side = 'buy' THEN
    -- Maker is buying, taker is selling
    PERFORM update_user_position(maker_order.user_id, maker_order.condition_id, maker_order.outcome_index, 
                               (SELECT token_id FROM outcomes WHERE condition_id = maker_order.condition_id AND outcome_index = maker_order.outcome_index),
                               p_shares_traded, p_price_per_share);
    PERFORM update_user_position(taker_order.user_id, taker_order.condition_id, taker_order.outcome_index,
                               (SELECT token_id FROM outcomes WHERE condition_id = taker_order.condition_id AND outcome_index = taker_order.outcome_index),
                               -p_shares_traded);
    
    -- Update balances
    PERFORM update_user_balance(maker_order.user_id, -(total_value + platform_fee + protocol_fee));
    PERFORM update_user_balance(taker_order.user_id, total_value);
  ELSE
    -- Maker is selling, taker is buying
    PERFORM update_user_position(maker_order.user_id, maker_order.condition_id, maker_order.outcome_index,
                               (SELECT token_id FROM outcomes WHERE condition_id = maker_order.condition_id AND outcome_index = maker_order.outcome_index),
                               -p_shares_traded);
    PERFORM update_user_position(taker_order.user_id, taker_order.condition_id, taker_order.outcome_index,
                               (SELECT token_id FROM outcomes WHERE condition_id = taker_order.condition_id AND outcome_index = taker_order.outcome_index),
                               p_shares_traded, p_price_per_share);
    
    -- Update balances
    PERFORM update_user_balance(maker_order.user_id, total_value);
    PERFORM update_user_balance(taker_order.user_id, -(total_value + platform_fee + protocol_fee));
  END IF;
  
  -- Unlock remaining balances
  PERFORM unlock_user_balance(maker_order.user_id, 
    LEAST(maker_order.remaining_amount * p_price_per_share, maker_order.amount * p_price_per_share));
  PERFORM unlock_user_balance(taker_order.user_id,
    LEAST(taker_order.remaining_amount * p_price_per_share, taker_order.amount * p_price_per_share));
  
  -- Record fees
  INSERT INTO fee_ledger (trade_id, fee_type, amount, recipient_address)
  VALUES (trade_id, 'platform', platform_fee, '0x_platform_wallet_address');
  
  INSERT INTO fee_ledger (trade_id, fee_type, amount, recipient_address)  
  VALUES (trade_id, 'protocol', protocol_fee, '0x_protocol_wallet_address');
  
  RETURN trade_id;
END;
$$;

-- ===========================================
-- 6. TRIGGERS
-- ===========================================

-- Updated_at triggers for all tables
CREATE TRIGGER update_user_balances_updated_at
  BEFORE UPDATE ON user_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_positions_updated_at
  BEFORE UPDATE ON user_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update remaining amount on orders
CREATE OR REPLACE FUNCTION update_order_remaining_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.remaining_amount := NEW.amount - NEW.filled_amount;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_order_remaining_amount_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_order_remaining_amount();

-- ===========================================
-- 7. VIEWS
-- ===========================================

-- User portfolio view - Combines positions and balances
CREATE OR REPLACE VIEW v_user_portfolio WITH (security_invoker = TRUE) AS
SELECT 
  u.id as user_id,
  u.address,
  u.username,
  COALESCE(ub.available_balance, 0) as available_balance,
  COALESCE(ub.locked_balance, 0) as locked_balance,
  COALESCE(ub.total_balance, 0) as total_balance,
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'condition_id', up.condition_id,
      'outcome_index', up.outcome_index,
      'token_id', up.outcome_token_id,
      'shares_owned', up.shares_owned,
      'average_cost_basis', up.average_cost_basis,
      'total_cost_basis', up.total_cost_basis,
      'current_value', up.shares_owned * COALESCE(o.current_price, 0),
      'unrealized_pnl', (up.shares_owned * COALESCE(o.current_price, 0)) - up.total_cost_basis
    )
  ) FILTER (WHERE up.condition_id IS NOT NULL) as positions
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN user_positions up ON u.id = up.user_id
LEFT JOIN outcomes o ON up.condition_id = o.condition_id AND up.outcome_index = o.outcome_index
GROUP BY u.id, u.address, u.username, ub.available_balance, ub.locked_balance, ub.total_balance;

-- Order book view - Shows pending orders for market depth
CREATE OR REPLACE VIEW v_order_book WITH (security_invoker = TRUE) AS
SELECT 
  o.condition_id,
  o.outcome_index,
  o.side,
  o.price,
  SUM(o.remaining_amount) as total_amount,
  COUNT(*) as order_count,
  MIN(o.created_at) as oldest_order
FROM orders o
WHERE o.status IN ('pending', 'partial')
  AND o.price IS NOT NULL
GROUP BY o.condition_id, o.outcome_index, o.side, o.price
ORDER BY o.condition_id, o.outcome_index, o.side, 
  CASE WHEN o.side = 'buy' THEN -o.price ELSE o.price END;

-- ===========================================
-- 8. INITIAL DATA
-- ===========================================

-- Insert default balances for existing users (if any)
INSERT INTO user_balances (user_id, available_balance, total_balance)
SELECT 
  u.id,
  1000.00, -- Default starting balance
  1000.00
FROM users u
ON CONFLICT (user_id) DO NOTHING;
