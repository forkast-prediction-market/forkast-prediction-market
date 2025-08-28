-- ============================================================
-- 0003_tables_core.sql - Core Blockchain Tables
-- ============================================================
-- Core foundation tables for blockchain data

-- Conditions table - Primary entity from Activity/PnL subgraphs
CREATE TABLE IF NOT EXISTS conditions (
  id VARCHAR(66) PRIMARY KEY,
  oracle VARCHAR(42) NOT NULL,
  question_id VARCHAR(66) NOT NULL,
  outcome_slot_count INTEGER NOT NULL CHECK (outcome_slot_count >= 2),
  -- Resolution data
  resolved BOOLEAN DEFAULT FALSE,
  payout_numerators BIGINT[],
  payout_denominator BIGINT,
  -- Metadata
  arweave_hash TEXT, -- Arweave metadata hash
  creator VARCHAR(42), -- Market creator address
  -- Cached aggregations for performance
  total_volume DECIMAL(20, 6) DEFAULT 0,
  open_interest DECIMAL(30, 18) DEFAULT 0,
  active_positions_count INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Position Balances - From PnL subgraph
CREATE TABLE IF NOT EXISTS user_position_balances (
  id TEXT PRIMARY KEY, -- user_address + token_id
  user_address VARCHAR(42) NOT NULL,
  token_id TEXT NOT NULL, -- ERC1155 token ID (String from subgraph)
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  outcome_index INTEGER NOT NULL,
  -- Balance data (18 decimals for tokens)
  balance DECIMAL(30, 18) NOT NULL DEFAULT 0,
  wrapped_balance DECIMAL(30, 18) NOT NULL DEFAULT 0,
  -- Cost basis and PnL (6 decimals for USDC)
  total_cost DECIMAL(20, 6) NOT NULL DEFAULT 0,
  realized_pnl DECIMAL(20, 6) NOT NULL DEFAULT 0,
  unrealized_pnl DECIMAL(20, 6) NOT NULL DEFAULT 0,
  -- Timestamps
  last_updated_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Constraints
  CHECK (outcome_index >= 0),
  CHECK (balance >= 0),
  CHECK (wrapped_balance >= 0)
);

-- Order Fills - From PnL and Orderbook subgraphs
CREATE TABLE IF NOT EXISTS order_fills (
  id TEXT PRIMARY KEY,
  transaction_hash VARCHAR(66) NOT NULL,
  order_hash VARCHAR(66), -- From orderbook subgraph
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  -- Trading parties
  maker VARCHAR(42) NOT NULL,
  taker VARCHAR(42) NOT NULL,
  -- Asset details
  maker_asset_id TEXT NOT NULL,
  taker_asset_id TEXT NOT NULL,
  maker_amount_filled DECIMAL(30, 18) NOT NULL,
  taker_amount_filled DECIMAL(30, 18) NOT NULL,
  -- Fee and pricing
  fee DECIMAL(20, 6) NOT NULL DEFAULT 0,
  price DECIMAL(8, 4),
  -- Market context (derived from asset IDs)
  condition_id VARCHAR(66) REFERENCES conditions(id),
  outcome_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Constraints
  CHECK (maker_amount_filled > 0),
  CHECK (taker_amount_filled > 0),
  CHECK (fee >= 0)
);

-- Global Orders Matched - From Orderbook subgraph
CREATE TABLE IF NOT EXISTS orders_matched_global (
  id TEXT PRIMARY KEY DEFAULT '',
  trades_quantity BIGINT NOT NULL DEFAULT 0,
  buys_quantity BIGINT NOT NULL DEFAULT 0,
  sells_quantity BIGINT NOT NULL DEFAULT 0,
  collateral_volume DECIMAL(20, 6) DEFAULT 0,
  scaled_collateral_volume DECIMAL(20, 6) DEFAULT 0,
  collateral_buy_volume DECIMAL(20, 6) DEFAULT 0,
  scaled_collateral_buy_volume DECIMAL(20, 6) DEFAULT 0,
  collateral_sell_volume DECIMAL(20, 6) DEFAULT 0,
  scaled_collateral_sell_volume DECIMAL(20, 6) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  CHECK (trades_quantity >= 0),
  CHECK (buys_quantity >= 0),
  CHECK (sells_quantity >= 0)
);

-- Market Open Interest - From OI subgraph
CREATE TABLE IF NOT EXISTS market_open_interest (
  condition_id VARCHAR(66) PRIMARY KEY REFERENCES conditions(id) ON DELETE CASCADE,
  amount DECIMAL(30, 18) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  CHECK (amount >= 0)
);

-- Global Open Interest - From OI subgraph
CREATE TABLE IF NOT EXISTS global_open_interest (
  id TEXT PRIMARY KEY DEFAULT '',
  amount DECIMAL(30, 18) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  CHECK (amount >= 0)
);

-- Position Activity Tables - From Activity subgraph
CREATE TABLE IF NOT EXISTS position_splits (
  id VARCHAR(66) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  stakeholder VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  amount DECIMAL(30, 18) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS position_merges (
  id VARCHAR(66) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  stakeholder VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  amount DECIMAL(30, 18) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS redemptions (
  id VARCHAR(66) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  redeemer VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  index_sets BIGINT[] NOT NULL,
  payout DECIMAL(30, 18) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (payout >= 0)
);

-- Market Resolutions - From Resolution subgraph
CREATE TABLE IF NOT EXISTS market_resolutions (
  question_id VARCHAR(66) PRIMARY KEY,
  condition_id VARCHAR(66) REFERENCES conditions(id),
  -- Resolution metadata
  author VARCHAR(42) NOT NULL,
  ancillary_data BYTEA NOT NULL,
  last_update_timestamp TIMESTAMPTZ NOT NULL,
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'initialized',
  was_disputed BOOLEAN DEFAULT FALSE,
  approved BOOLEAN,
  -- Price data (18 decimals to match UMA precision)
  proposed_price DECIMAL(30, 18),
  reproposed_price DECIMAL(30, 18),
  final_price DECIMAL(30, 18),
  updates TEXT,
  transaction_hash VARCHAR(66),
  log_index BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (status IN ('initialized', 'posed', 'proposed', 'challenged', 'reproposed', 'disputed', 'resolved'))
);

-- Sports Oracle Tables
CREATE TABLE IF NOT EXISTS sports_games (
  id TEXT PRIMARY KEY,
  ancillary_data TEXT NOT NULL,
  ordering TEXT NOT NULL,
  state VARCHAR(20) NOT NULL,
  home_score BIGINT DEFAULT 0,
  away_score BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (home_score >= 0),
  CHECK (away_score >= 0)
);

CREATE TABLE IF NOT EXISTS sports_markets (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES sports_games(id) ON DELETE CASCADE,
  condition_id VARCHAR(66) REFERENCES conditions(id),
  state VARCHAR(20) NOT NULL,
  market_type VARCHAR(50) NOT NULL,
  underdog VARCHAR(10),
  line BIGINT,
  payouts BIGINT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (underdog IS NULL OR underdog IN ('home', 'away'))
);

-- Collateral Tokens - From FPMM subgraph
CREATE TABLE IF NOT EXISTS collaterals (
  id VARCHAR(42) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (decimals >= 0)
);

-- FPMM Tables - From FPMM subgraph
CREATE TABLE IF NOT EXISTS fpmms (
  id VARCHAR(42) PRIMARY KEY,
  condition_id VARCHAR(66) REFERENCES conditions(id),
  creator VARCHAR(42) NOT NULL,
  creation_timestamp TIMESTAMPTZ NOT NULL,
  creation_transaction_hash VARCHAR(66) NOT NULL,
  collateral_token_address VARCHAR(42) NOT NULL REFERENCES collaterals(id),
  conditional_token_address VARCHAR(42) NOT NULL,
  fee DECIMAL(30, 18) NOT NULL,
  trades_quantity BIGINT DEFAULT 0,
  buys_quantity BIGINT DEFAULT 0,
  sells_quantity BIGINT DEFAULT 0,
  liquidity_add_quantity BIGINT DEFAULT 0,
  liquidity_remove_quantity BIGINT DEFAULT 0,
  collateral_volume DECIMAL(30, 18) DEFAULT 0,
  scaled_collateral_volume DECIMAL(20, 6) DEFAULT 0,
  collateral_buy_volume DECIMAL(30, 18) DEFAULT 0,
  scaled_collateral_buy_volume DECIMAL(20, 6) DEFAULT 0,
  collateral_sell_volume DECIMAL(30, 18) DEFAULT 0,
  scaled_collateral_sell_volume DECIMAL(20, 6) DEFAULT 0,
  fee_volume DECIMAL(30, 18) DEFAULT 0,
  scaled_fee_volume DECIMAL(20, 6) DEFAULT 0,
  liquidity_parameter DECIMAL(30, 18) DEFAULT 0,
  scaled_liquidity_parameter DECIMAL(20, 6) DEFAULT 0,
  outcome_token_amounts DECIMAL(30, 18)[],
  outcome_token_prices DECIMAL(8, 4)[],
  outcome_slot_count INTEGER,
  total_supply DECIMAL(30, 18) DEFAULT 0,
  last_active_day TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (fee >= 0),
  CHECK (trades_quantity >= 0),
  CHECK (outcome_slot_count IS NULL OR outcome_slot_count >= 2)
);

-- FPMM Pool Memberships - From FPMM subgraph
CREATE TABLE IF NOT EXISTS fpmm_pool_memberships (
  id TEXT PRIMARY KEY,
  fpmm_id VARCHAR(42) NOT NULL REFERENCES fpmms(id) ON DELETE CASCADE,
  funder VARCHAR(42) NOT NULL,
  amount DECIMAL(30, 18) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (amount >= 0),
  UNIQUE (fpmm_id, funder)
);

-- Global USDC Balance
CREATE TABLE IF NOT EXISTS global_usdc_balance (
  id TEXT PRIMARY KEY DEFAULT '',
  balance DECIMAL(20, 6) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  CHECK (balance >= 0)
);
