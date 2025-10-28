-- Add snapshot metadata columns to markets
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS last_snapshot_at timestamptz;

-- Expand outcomes numerical precision for prices
ALTER TABLE outcomes
  ALTER COLUMN current_price TYPE numeric(20, 10)
  USING current_price::numeric(20, 10);

-- Add order book and trade metadata to outcomes
ALTER TABLE outcomes
  ADD COLUMN IF NOT EXISTS best_bid_price numeric(20, 10),
  ADD COLUMN IF NOT EXISTS best_bid_size numeric(28, 8),
  ADD COLUMN IF NOT EXISTS best_ask_price numeric(20, 10),
  ADD COLUMN IF NOT EXISTS best_ask_size numeric(28, 8),
  ADD COLUMN IF NOT EXISTS open_interest numeric(28, 8),
  ADD COLUMN IF NOT EXISTS last_trade_price numeric(20, 10),
  ADD COLUMN IF NOT EXISTS last_trade_ts timestamptz,
  ADD COLUMN IF NOT EXISTS snapshot_ts timestamptz;

-- Store recent fills per outcome for quick access
CREATE TABLE IF NOT EXISTS outcome_recent_trades (
  trade_id text PRIMARY KEY,
  token_id text NOT NULL REFERENCES outcomes(token_id) ON DELETE CASCADE,
  price numeric(20, 10) NOT NULL,
  size numeric(28, 8) NOT NULL,
  side text NOT NULL,
  executed_at timestamptz NOT NULL,
  buyer_order_id text,
  seller_order_id text,
  inserted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outcome_recent_trades_token_idx
  ON outcome_recent_trades (token_id, executed_at DESC);

ALTER TABLE outcome_recent_trades
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_outcome_recent_trades"
  ON outcome_recent_trades
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);
