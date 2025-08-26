-- 🎯 COMPLETE DATABASE STRUCTURE - FORKAST MARKETS
-- For Supabase (PostgreSQL)
-- Enhanced schema supporting all 8 subgraphs: Activity, PnL, OI, Sports Oracle, FPMM, Orderbook, Wallet, Resolution
--
-- ⚠️  IMPORTANT: This schema includes GRANT statements for service_role
-- These are CRITICAL for sync operations to work properly.
-- Without these GRANTs, the sync-markets.js will fail with "permission denied" errors.
-- ============================================================
-- 0. 🔗 CORE FOUNDATION TABLES (BLOCKCHAIN DATA)
-- ============================================================
-- Conditions table - Primary entity from Activity/PnL subgraphs
CREATE TABLE IF NOT EXISTS conditions (
  id VARCHAR(66) PRIMARY KEY,
  oracle VARCHAR(42) NOT NULL,
  question_id VARCHAR(66) NOT NULL,
  outcome_slot_count INTEGER NOT NULL CHECK (outcome_slot_count >= 2),
  -- Resolution data
  resolved BOOLEAN DEFAULT FALSE,
  payout_numerators BIGINT [ ],
  payout_denominator BIGINT,
  -- Metadata
  arweave_hash TEXT,
  -- Arweave metadata hash
  creator VARCHAR(42),
  -- Market creator address
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
  id TEXT PRIMARY KEY,
  -- user_address + token_id
  user_address VARCHAR(42) NOT NULL,
  token_id TEXT NOT NULL,
  -- ERC1155 token ID (String from subgraph)
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
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
  order_hash VARCHAR(66),
  -- From orderbook subgraph
  block_number BIGINT NOT NULL,
  TIMESTAMP TIMESTAMPTZ NOT NULL,
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
  condition_id VARCHAR(66) REFERENCES conditions (id),
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
  trades_quantity BIGINT DEFAULT 0,
  buys_quantity BIGINT DEFAULT 0,
  sells_quantity BIGINT DEFAULT 0,
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
  condition_id VARCHAR(66) PRIMARY KEY REFERENCES conditions (id) ON DELETE CASCADE,
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
  TIMESTAMP TIMESTAMPTZ NOT NULL,
  stakeholder VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  amount DECIMAL(30, 18) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS position_merges (
  id VARCHAR(66) PRIMARY KEY,
  TIMESTAMP TIMESTAMPTZ NOT NULL,
  stakeholder VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  amount DECIMAL(30, 18) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS redemptions (
  id VARCHAR(66) PRIMARY KEY,
  TIMESTAMP TIMESTAMPTZ NOT NULL,
  redeemer VARCHAR(42) NOT NULL,
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  index_sets BIGINT [ ] NOT NULL,
  payout DECIMAL(30, 18) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (payout >= 0)
);

-- Market Resolutions - From Resolution subgraph
CREATE TABLE IF NOT EXISTS market_resolutions (
  question_id VARCHAR(66) PRIMARY KEY,
  condition_id VARCHAR(66) REFERENCES conditions (id),
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
  CHECK (
    status IN (
      'initialized',
      'posed',
      'proposed',
      'challenged',
      'reproposed',
      'disputed',
      'resolved'
    )
  )
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
  game_id TEXT NOT NULL REFERENCES sports_games (id) ON DELETE CASCADE,
  condition_id VARCHAR(66) REFERENCES conditions (id),
  state VARCHAR(20) NOT NULL,
  market_type VARCHAR(50) NOT NULL,
  underdog VARCHAR(10),
  line BIGINT,
  payouts BIGINT [ ],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (
    underdog IS NULL
    OR underdog IN ('home', 'away')
  )
);

-- Collateral Tokens - From FPMM subgraph
CREATE TABLE IF NOT EXISTS collaterals (
  id VARCHAR(42) PRIMARY KEY,
  NAME TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (decimals >= 0)
);

-- FPMM Tables - From FPMM subgraph
CREATE TABLE IF NOT EXISTS fpmms (
  id VARCHAR(42) PRIMARY KEY,
  condition_id VARCHAR(66) REFERENCES conditions (id),
  creator VARCHAR(42) NOT NULL,
  creation_timestamp TIMESTAMPTZ NOT NULL,
  creation_transaction_hash VARCHAR(66) NOT NULL,
  collateral_token_address VARCHAR(42) NOT NULL REFERENCES collaterals (id),
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
  outcome_token_amounts DECIMAL(30, 18) [ ],
  outcome_token_prices DECIMAL(8, 4) [ ],
  outcome_slot_count INTEGER,
  total_supply DECIMAL(30, 18) DEFAULT 0,
  last_active_day TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (fee >= 0),
  CHECK (trades_quantity >= 0),
  CHECK (
    outcome_slot_count IS NULL
    OR outcome_slot_count >= 2
  )
);

-- FPMM Pool Memberships - From FPMM subgraph
CREATE TABLE IF NOT EXISTS fpmm_pool_memberships (
  id TEXT PRIMARY KEY,
  fpmm_id VARCHAR(42) NOT NULL REFERENCES fpmms (id) ON DELETE CASCADE,
  funder VARCHAR(42) NOT NULL,
  amount DECIMAL(30, 18) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (amount >= 0),
  UNIQUE (fpmm_id, funder)
);

CREATE TABLE IF NOT EXISTS global_usdc_balance (
  id TEXT PRIMARY KEY DEFAULT '',
  balance DECIMAL(20, 6) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  address TEXT UNIQUE,
  username TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  bio TEXT,
  image TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMP,
  refresh_token_expires_at TIMESTAMP,
  scope TEXT,
  PASSWORD TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verifications (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier TEXT NOT NULL,
  VALUE TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  balance DECIMAL(20, 6) DEFAULT 0,
  chain_id INTEGER NOT NULL,
  is_primary BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bookmarks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- ============================================================
-- 1. 🏷️ TAGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  NAME VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_main_category BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  parent_tag_id INTEGER REFERENCES tags (id),
  active_markets_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. 🎪 EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  creator VARCHAR(42),
  icon_url TEXT,
  show_market_icons BOOLEAN DEFAULT TRUE,
  rules TEXT,
  active_markets_count INTEGER DEFAULT 0,
  total_markets_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. 🔗 EVENT-TAG RELATIONSHIP TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS event_tags (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, tag_id)
);

-- ============================================================
-- 4. 🎯 MARKETS TABLE (ENHANCED WITH SUBGRAPH DATA)
-- ============================================================
CREATE TABLE IF NOT EXISTS markets (
  -- IDs and Identifiers
  condition_id VARCHAR(66) PRIMARY KEY REFERENCES conditions (id) ON DELETE CASCADE,
  question_id VARCHAR(66) NOT NULL,
  -- Derived from conditions table
  oracle VARCHAR(42) NOT NULL,
  -- Derived from conditions table
  -- Relationships
  event_id INTEGER NOT NULL REFERENCES events (id),
  -- Market Information
  NAME TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  short_title VARCHAR(255),
  outcome_count INTEGER NOT NULL CHECK (outcome_count >= 2),
  -- Images
  icon_url TEXT,
  -- markets/icons/market-slug.jpg
  -- Status and Data
  is_active BOOLEAN DEFAULT TRUE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_data JSONB,
  -- Resolution data when resolved
  -- Blockchain Info
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  block_timestamp TIMESTAMPTZ NOT NULL,
  -- Metadata
  metadata JSONB,
  -- Metadata from Arweave
  -- Cached Trading Metrics (from subgraphs)
  current_volume_24h DECIMAL(20, 6) DEFAULT 0,
  total_volume DECIMAL(20, 6) DEFAULT 0,
  open_interest DECIMAL(30, 18) DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Constraints
  UNIQUE (event_id, slug),
  CHECK (current_volume_24h >= 0),
  CHECK (total_volume >= 0),
  CHECK (open_interest >= 0)
);

-- ============================================================
-- 5. 🎲 OUTCOMES TABLE (ENHANCED WITH TRADING DATA)
-- ============================================================
CREATE TABLE IF NOT EXISTS outcomes (
  id SERIAL PRIMARY KEY,
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions (id) ON DELETE CASCADE,
  outcome_text TEXT NOT NULL,
  outcome_index INTEGER NOT NULL,
  -- 0, 1, 2... outcome order
  token_id TEXT NOT NULL,
  -- ERC1155 token ID for this outcome
  -- Resolution data
  is_winning_outcome BOOLEAN DEFAULT FALSE,
  -- When resolved
  payout_value DECIMAL(20, 6),
  -- Final payout value
  -- Trading metrics (cached from subgraphs)
  current_price DECIMAL(8, 4),
  -- Current market price (0.0001 to 0.9999)
  volume_24h DECIMAL(20, 6) DEFAULT 0,
  total_volume DECIMAL(20, 6) DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Constraints
  UNIQUE (condition_id, outcome_index),
  UNIQUE (token_id),
  CHECK (outcome_index >= 0),
  CHECK (
    current_price IS NULL
    OR (
      current_price >= 0.0001
      AND current_price <= 0.9999
    )
  ),
  CHECK (volume_24h >= 0),
  CHECK (total_volume >= 0),
  CHECK (
    payout_value IS NULL
    OR payout_value >= 0
  )
);

-- ============================================================
-- 6. 📊 SYNC STATUS TABLE (ENHANCED FOR MULTIPLE SUBGRAPHS)
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(50) NOT NULL,
  -- 'activity_sync', 'pnl_sync', etc.
  subgraph_name VARCHAR(50) NOT NULL,
  -- 'activity', 'pnl', 'oi', etc.
  last_processed_block BIGINT DEFAULT 0,
  last_sync_timestamp TIMESTAMPTZ DEFAULT now(),
  sync_type VARCHAR(20) DEFAULT 'incremental',
  -- 'full' or 'incremental'
  status VARCHAR(20) DEFAULT 'idle',
  -- 'running', 'completed', 'error'
  error_message TEXT,
  total_processed INTEGER DEFAULT 0,
  processing_rate DECIMAL(10, 2),
  -- records per second
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Constraints
  UNIQUE (service_name, subgraph_name),
  CHECK (status IN ('idle', 'running', 'completed', 'error')),
  CHECK (sync_type IN ('full', 'incremental')),
  CHECK (total_processed >= 0),
  CHECK (
    processing_rate IS NULL
    OR processing_rate >= 0
  )
);

-- ============================================================
-- 7. 📈 PERFORMANCE INDEXES
-- ============================================================
-- Core Foundation Tables Indexes
CREATE INDEX idx_conditions_oracle ON conditions (oracle);

CREATE INDEX idx_conditions_question_id ON conditions (question_id);

CREATE INDEX idx_conditions_resolved ON conditions (resolved);

CREATE INDEX idx_conditions_creator ON conditions (creator);

CREATE INDEX idx_conditions_total_volume ON conditions (total_volume DESC);

CREATE INDEX idx_conditions_open_interest ON conditions (open_interest DESC);

-- User Position Balances Indexes
CREATE INDEX idx_user_positions_user ON user_position_balances (user_address);

CREATE INDEX idx_user_positions_condition ON user_position_balances (condition_id);

CREATE INDEX idx_user_positions_token ON user_position_balances (token_id);

CREATE INDEX idx_user_positions_user_condition ON user_position_balances (user_address, condition_id);

CREATE INDEX idx_user_positions_balance ON user_position_balances (balance DESC)
WHERE
  balance > 0;

CREATE INDEX idx_user_positions_pnl ON user_position_balances (realized_pnl DESC);

CREATE INDEX idx_user_positions_updated ON user_position_balances (last_updated_timestamp DESC);

-- Order Fills Indexes
CREATE INDEX idx_order_fills_timestamp ON order_fills (TIMESTAMP DESC);

CREATE INDEX idx_order_fills_maker ON order_fills (maker);

CREATE INDEX idx_order_fills_taker ON order_fills (taker);

CREATE INDEX idx_order_fills_condition ON order_fills (condition_id);

CREATE INDEX idx_order_fills_tx_hash ON order_fills (transaction_hash);

CREATE INDEX idx_order_fills_block ON order_fills (block_number);

CREATE INDEX idx_order_fills_maker_timestamp ON order_fills (maker, TIMESTAMP DESC);

CREATE INDEX idx_order_fills_taker_timestamp ON order_fills (taker, TIMESTAMP DESC);

CREATE INDEX idx_order_fills_condition_timestamp ON order_fills (condition_id, TIMESTAMP DESC);

-- Position Activity Indexes
CREATE INDEX idx_splits_timestamp ON position_splits (TIMESTAMP DESC);

CREATE INDEX idx_splits_stakeholder ON position_splits (stakeholder);

CREATE INDEX idx_splits_condition ON position_splits (condition_id);

CREATE INDEX idx_splits_stakeholder_timestamp ON position_splits (stakeholder, TIMESTAMP DESC);

CREATE INDEX idx_merges_timestamp ON position_merges (TIMESTAMP DESC);

CREATE INDEX idx_merges_stakeholder ON position_merges (stakeholder);

CREATE INDEX idx_merges_condition ON position_merges (condition_id);

CREATE INDEX idx_merges_stakeholder_timestamp ON position_merges (stakeholder, TIMESTAMP DESC);

CREATE INDEX idx_redemptions_timestamp ON redemptions (TIMESTAMP DESC);

CREATE INDEX idx_redemptions_redeemer ON redemptions (redeemer);

CREATE INDEX idx_redemptions_condition ON redemptions (condition_id);

CREATE INDEX idx_redemptions_redeemer_timestamp ON redemptions (redeemer, TIMESTAMP DESC);

-- Market Resolution Indexes
CREATE INDEX idx_resolutions_question_id ON market_resolutions (question_id);

CREATE INDEX idx_resolutions_condition_id ON market_resolutions (condition_id);

CREATE INDEX idx_resolutions_status ON market_resolutions (status);

CREATE INDEX idx_resolutions_author ON market_resolutions (author);

CREATE INDEX idx_resolutions_timestamp ON market_resolutions (last_update_timestamp DESC);

CREATE INDEX idx_resolutions_disputed ON market_resolutions (was_disputed)
WHERE
  was_disputed = TRUE;

-- Sports Oracle Indexes
CREATE INDEX idx_sports_games_state ON sports_games (state);

CREATE INDEX idx_sports_games_ordering ON sports_games (ordering);

CREATE INDEX idx_sports_markets_game ON sports_markets (game_id);

CREATE INDEX idx_sports_markets_condition ON sports_markets (condition_id);

CREATE INDEX idx_sports_markets_type ON sports_markets (market_type);

-- FPMM Indexes
CREATE INDEX idx_fpmms_condition ON fpmms (condition_id);

CREATE INDEX idx_fpmms_creator ON fpmms (creator);

CREATE INDEX idx_fpmms_creation_time ON fpmms (creation_timestamp DESC);

CREATE INDEX idx_fpmms_volume ON fpmms (scaled_collateral_volume DESC);

CREATE INDEX idx_fpmms_trades ON fpmms (trades_quantity DESC);

CREATE INDEX idx_fpmms_active ON fpmms (last_active_day DESC);

-- Collaterals Indexes
CREATE INDEX idx_collaterals_symbol ON collaterals (symbol);

CREATE INDEX idx_collaterals_decimals ON collaterals (decimals);

-- FPMM Pool Memberships Indexes
CREATE INDEX idx_fpmm_pool_memberships_fpmm ON fpmm_pool_memberships (fpmm_id);

CREATE INDEX idx_fpmm_pool_memberships_funder ON fpmm_pool_memberships (funder);

CREATE INDEX idx_fpmm_pool_memberships_amount ON fpmm_pool_memberships (amount DESC)
WHERE
  amount > 0;

-- Markets - Enhanced indexes
CREATE INDEX idx_markets_event_id ON markets (event_id);

CREATE INDEX idx_markets_oracle ON markets (oracle);

CREATE INDEX idx_markets_block_number ON markets (block_number);

CREATE INDEX idx_markets_is_active ON markets (is_active);

CREATE INDEX idx_markets_is_resolved ON markets (is_resolved);

CREATE INDEX idx_markets_block_timestamp ON markets (block_timestamp);

CREATE INDEX idx_markets_active_unresolved ON markets (is_active, is_resolved)
WHERE
  is_active = TRUE
  AND is_resolved = FALSE;

CREATE INDEX idx_markets_volume_24h ON markets (current_volume_24h DESC);

CREATE INDEX idx_markets_total_volume ON markets (total_volume DESC);

CREATE INDEX idx_markets_open_interest ON markets (open_interest DESC);

-- Events - Enhanced indexes
CREATE INDEX idx_events_slug ON events (slug);

CREATE INDEX idx_events_creator ON events (creator);

CREATE INDEX idx_events_active_markets_count ON events (active_markets_count DESC);

CREATE INDEX idx_events_total_markets_count ON events (total_markets_count DESC);

-- Tags - Enhanced indexes
CREATE INDEX idx_tags_slug ON tags (slug);

CREATE INDEX idx_tags_is_main_category ON tags (is_main_category)
WHERE
  is_main_category = TRUE;

CREATE INDEX idx_tags_display_order ON tags (display_order);

CREATE INDEX idx_tags_active_markets_count ON tags (active_markets_count DESC);

CREATE INDEX idx_tags_parent_tag_id ON tags (parent_tag_id);

-- Event_Tags - Indexes
CREATE INDEX idx_event_tags_event_id ON event_tags (event_id);

CREATE INDEX idx_event_tags_tag_id ON event_tags (tag_id);

-- Outcomes - Enhanced indexes
CREATE INDEX idx_outcomes_condition_id ON outcomes (condition_id);

CREATE INDEX idx_outcomes_outcome_index ON outcomes (outcome_index);

CREATE INDEX idx_outcomes_is_winning ON outcomes (is_winning_outcome)
WHERE
  is_winning_outcome = TRUE;

CREATE INDEX idx_outcomes_token_id ON outcomes (token_id);

CREATE INDEX idx_outcomes_current_price ON outcomes (current_price DESC);

CREATE INDEX idx_outcomes_volume_24h ON outcomes (volume_24h DESC);

CREATE INDEX idx_outcomes_total_volume ON outcomes (total_volume DESC);

-- Sync Status - Enhanced indexes
CREATE INDEX idx_sync_status_service_name ON sync_status (service_name);

CREATE INDEX idx_sync_status_subgraph_name ON sync_status (subgraph_name);

CREATE INDEX idx_sync_status_last_sync ON sync_status (last_sync_timestamp);

CREATE INDEX idx_sync_status_status ON sync_status (status);

-- ============================================================
-- 8. 🔄 AUTO-UPDATE TRIGGERS
-- ============================================================
-- Function for automatic updated_at
CREATE
OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER
SET
  search_path = 'public' AS $$
begin
    NEW.updated_at = now();
    return NEW;
end;
$$ LANGUAGE 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_tags_updated_at BEFORE
UPDATE
  ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE
UPDATE
  ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_markets_updated_at BEFORE
UPDATE
  ON markets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outcomes_updated_at BEFORE
UPDATE
  ON outcomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_status_updated_at BEFORE
UPDATE
  ON sync_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conditions_updated_at BEFORE
UPDATE
  ON conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_resolutions_updated_at BEFORE
UPDATE
  ON market_resolutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sports_games_updated_at BEFORE
UPDATE
  ON sports_games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sports_markets_updated_at BEFORE
UPDATE
  ON sports_markets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fpmms_updated_at BEFORE
UPDATE
  ON fpmms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fpmm_pool_memberships_updated_at BEFORE
UPDATE
  ON fpmm_pool_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE
UPDATE
  ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE
UPDATE
  ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. 📊 FUNCTIONS FOR COUNTER CACHING
-- ============================================================
-- Function to update active markets count per event
CREATE
OR REPLACE FUNCTION update_event_markets_count() RETURNS TRIGGER
SET
  search_path = 'public' AS $$
begin
    -- Update affected event counter
    if TG_OP = 'INSERT' or TG_OP = 'UPDATE' then
        update public.events
        set active_markets_count = ( select count(*)
                                     from public.markets
                                     where event_id = NEW.event_id and is_active = true and is_resolved = false ),
            total_markets_count  = ( select count(*) from public.markets where event_id = NEW.event_id )
        where id = NEW.event_id;
    end if;

    -- If DELETE or UPDATE that changed event_id
    if TG_OP = 'DELETE' or (TG_OP = 'UPDATE' and OLD.event_id != NEW.event_id) then
        update public.events
        set active_markets_count = ( select count(*)
                                     from public.markets
                                     where event_id = OLD.event_id and is_active = true and is_resolved = false ),
            total_markets_count  = ( select count(*) from public.markets where event_id = OLD.event_id )
        where id = OLD.event_id;
    end if;

    return coalesce(NEW, OLD);
end;
$$ LANGUAGE 'plpgsql';

-- Trigger for event counters
CREATE TRIGGER trigger_update_event_markets_count
AFTER
INSERT
  OR
UPDATE
  OR DELETE ON markets FOR EACH ROW EXECUTE FUNCTION update_event_markets_count();

-- Function to update markets count per tag
CREATE
OR REPLACE FUNCTION update_tag_markets_count() RETURNS TRIGGER
SET
  search_path = 'public' AS $$
declare
    affected_event_id INTEGER;
begin
    -- Get the event_id from NEW or OLD
    affected_event_id := coalesce(NEW.event_id, OLD.event_id);

    -- Update only tags linked to this specific event
    update public.tags
    set active_markets_count = ( select count(distinct m.condition_id)
                                 from public.markets m
                                          join public.event_tags et on m.event_id = et.event_id
                                 where et.tag_id = public.tags.id
                                   and m.is_active = true
                                   and m.is_resolved = false )
    where id in ( select distinct et.tag_id from public.event_tags et where et.event_id = affected_event_id );

    return coalesce(NEW, OLD);
end;
$$ LANGUAGE 'plpgsql';

-- Trigger for tag counters
CREATE TRIGGER trigger_update_tag_markets_count
AFTER
INSERT
  OR
UPDATE
  OR DELETE ON markets FOR EACH ROW EXECUTE FUNCTION update_tag_markets_count();

CREATE TRIGGER trigger_update_tag_markets_count_event_tags
AFTER
INSERT
  OR
UPDATE
  OR DELETE ON event_tags FOR EACH ROW EXECUTE FUNCTION update_tag_markets_count();

-- ============================================================
-- 10. 📝 INITIAL DATA INSERTION
-- ============================================================
-- Insert initial sync status for all subgraphs
INSERT INTO
  sync_status (
    service_name,
    subgraph_name,
    last_processed_block,
    sync_type,
    status
  )
VALUES
  ('activity_sync', 'activity', 0, 'full', 'idle'),
  ('pnl_sync', 'pnl', 0, 'full', 'idle'),
  ('oi_sync', 'oi', 0, 'full', 'idle'),
  ('sports_sync', 'sports', 0, 'full', 'idle'),
  ('fpmm_sync', 'fpmm', 0, 'full', 'idle'),
  ('orderbook_sync', 'orderbook', 0, 'full', 'idle'),
  ('wallet_sync', 'wallet', 0, 'full', 'idle'),
  ('resolution_sync', 'resolution', 0, 'full', 'idle'),
  ('market_sync', 'activity', 0, 'full', 'idle') ON CONFLICT (service_name, subgraph_name) DO NOTHING;

-- Insert initial main tags
INSERT INTO
  tags (NAME, slug, is_main_category, display_order)
VALUES
  ('Politics', 'politics', TRUE, 1),
  ('Middle East', 'middle-east', TRUE, 2),
  ('Sports', 'sports', TRUE, 3),
  ('Crypto', 'crypto', TRUE, 4),
  ('Tech', 'tech', TRUE, 5),
  ('Culture', 'culture', TRUE, 6),
  ('World', 'world', TRUE, 7),
  ('Economy', 'economy', TRUE, 8),
  ('Trump', 'trump', TRUE, 9),
  ('Elections', 'elections', TRUE, 10),
  ('Mentions', 'mentions', TRUE, 11) ON CONFLICT (slug) DO NOTHING;

-- Insert sub-tags of Sports
INSERT INTO
  tags (
    NAME,
    slug,
    is_main_category,
    parent_tag_id,
    display_order
  )
VALUES
  (
    'Tennis',
    'tennis',
    FALSE,
    (
      SELECT
        id
      FROM
        tags
      WHERE
        slug = 'sports'
    ),
    1
  ),
  (
    'Football',
    'football',
    FALSE,
    (
      SELECT
        id
      FROM
        tags
      WHERE
        slug = 'sports'
    ),
    2
  ),
  (
    'Basketball',
    'basketball',
    FALSE,
    (
      SELECT
        id
      FROM
        tags
      WHERE
        slug = 'sports'
    ),
    3
  ),
  (
    'Baseball',
    'baseball',
    FALSE,
    (
      SELECT
        id
      FROM
        tags
      WHERE
        slug = 'sports'
    ),
    4
  ) ON CONFLICT (slug) DO NOTHING;

-- Insert initial collateral token (USDC)
INSERT INTO
  collaterals (id, NAME, symbol, decimals)
VALUES
  (
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'USD Coin',
    'USDC',
    6
  ) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. 🔍 USEFUL VIEWS FOR QUERIES
-- ============================================================
-- View for markets with complete information (security invoker)
CREATE
OR REPLACE VIEW v_markets_full WITH (security_invoker = TRUE) AS
SELECT
  m.condition_id,
  m.name AS market_name,
  m.slug AS market_slug,
  m.outcome_count,
  m.is_active,
  m.is_resolved,
  m.icon_url AS market_icon_url,
  m.block_number,
  m.block_timestamp,
  m.current_volume_24h,
  m.total_volume,
  m.open_interest,
  e.id AS event_id,
  e.title AS event_title,
  e.slug AS event_slug,
  e.icon_url AS event_icon_url,
  c.oracle,
  c.question_id,
  c.outcome_slot_count,
  c.resolved,
  c.payout_numerators,
  c.payout_denominator,
  c.arweave_hash,
  c.creator,
  array_agg(DISTINCT t.name) AS tags,
  array_agg(DISTINCT t.slug) AS tag_slugs,
  (
    SELECT
      json_agg(
        json_build_object(
          'text',
          o.outcome_text,
          'index',
          o.outcome_index,
          'token_id',
          o.token_id,
          'is_winning',
          o.is_winning_outcome,
          'current_price',
          o.current_price,
          'volume_24h',
          o.volume_24h,
          'total_volume',
          o.total_volume
        )
        ORDER BY
          o.outcome_index
      )
    FROM
      outcomes o
    WHERE
      o.condition_id = m.condition_id
  ) AS outcomes
FROM
  markets m
  JOIN events e ON m.event_id = e.id
  JOIN conditions c ON m.condition_id = c.id
  LEFT JOIN event_tags et ON e.id = et.event_id
  LEFT JOIN tags t ON et.tag_id = t.id
GROUP BY
  m.condition_id,
  e.id,
  c.id;

-- View for tags with counters (security invoker)
CREATE
OR REPLACE VIEW v_tags_with_counts WITH (security_invoker = TRUE) AS
SELECT
  t.*,
  COALESCE(parent.name, '') AS parent_tag_name,
  (
    SELECT
      count(*)
    FROM
      tags child
    WHERE
      child.parent_tag_id = t.id
  ) AS child_tags_count
FROM
  tags t
  LEFT JOIN tags parent ON t.parent_tag_id = parent.id;

-- View for user positions with market context
CREATE
OR REPLACE VIEW v_user_positions_full WITH (security_invoker = TRUE) AS
SELECT
  upb.*,
  c.oracle,
  c.question_id,
  c.resolved,
  m.name AS market_name,
  m.slug AS market_slug,
  e.title AS event_title,
  o.outcome_text,
  o.current_price
FROM
  user_position_balances upb
  JOIN conditions c ON upb.condition_id = c.id
  LEFT JOIN markets m ON c.id = m.condition_id
  LEFT JOIN events e ON m.event_id = e.id
  LEFT JOIN outcomes o ON c.id = o.condition_id
  AND upb.outcome_index = o.outcome_index
WHERE
  upb.balance > 0;

-- ============================================================
-- 12. 🛡️ ROW LEVEL SECURITY
-- ============================================================
-- Enable RLS on all public tables
ALTER TABLE
  markets ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  events ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  event_tags ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  outcomes ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  sync_status ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  conditions ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  user_position_balances ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  order_fills ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  orders_matched_global ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  market_open_interest ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  global_open_interest ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  position_splits ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  position_merges ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  redemptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  market_resolutions ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  sports_games ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  sports_markets ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  fpmms ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  collaterals ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  fpmm_pool_memberships ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  global_usdc_balance ENABLE ROW LEVEL SECURITY;

ALTER TABLE
  wallets ENABLE ROW LEVEL SECURITY;

-- Public read policies for anonymous users
CREATE POLICY "Markets are public" ON markets FOR
SELECT
  TO anon USING (is_active = TRUE);

CREATE POLICY "Events are public" ON events FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Tags are public" ON tags FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Event tags are public" ON event_tags FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Outcomes are public" ON outcomes FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Conditions are public" ON conditions FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Order fills are public" ON order_fills FOR
SELECT
  TO anon USING (TRUE);

-- Additional public read policies for blockchain data
CREATE POLICY "Orders matched global are public" ON orders_matched_global FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Market open interest is public" ON market_open_interest FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Global open interest is public" ON global_open_interest FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Position splits are public" ON position_splits FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Position merges are public" ON position_merges FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Redemptions are public" ON redemptions FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Market resolutions are public" ON market_resolutions FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Sports games are public" ON sports_games FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Sports markets are public" ON sports_markets FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "FPMMs are public" ON fpmms FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Collaterals are public" ON collaterals FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "FPMM pool memberships are public" ON fpmm_pool_memberships FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Global USDC balance is public" ON global_usdc_balance FOR
SELECT
  TO anon USING (TRUE);

CREATE POLICY "Wallets are public" ON wallets FOR
SELECT
  TO anon USING (TRUE);

-- User position balances - users can only see their own
CREATE POLICY "Users can see own positions" ON user_position_balances FOR
SELECT
  TO authenticated USING (user_address = auth.jwt() ->> 'wallet_address');

-- Sync status - only for authenticated service role
CREATE POLICY "Sync status for service role" ON sync_status FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Service role policies (full access for sync operations)
CREATE POLICY "service_role_all_sync_status" ON sync_status FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_conditions" ON conditions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_markets" ON markets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_events" ON events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_tags" ON tags FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_event_tags" ON event_tags FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_outcomes" ON outcomes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_user_positions" ON user_position_balances FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_order_fills" ON order_fills FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Service role policies for additional tables
CREATE POLICY "service_role_all_orders_matched_global" ON orders_matched_global FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_market_open_interest" ON market_open_interest FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_global_open_interest" ON global_open_interest FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_position_splits" ON position_splits FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_position_merges" ON position_merges FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_redemptions" ON redemptions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_market_resolutions" ON market_resolutions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_sports_games" ON sports_games FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_sports_markets" ON sports_markets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_fpmms" ON fpmms FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_collaterals" ON collaterals FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_fpmm_pool_memberships" ON fpmm_pool_memberships FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_global_usdc_balance" ON global_usdc_balance FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service_role_all_wallets" ON wallets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Admin policies for authenticated users (if needed)
CREATE POLICY "Markets admin access" ON markets FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Events admin access" ON events FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Tags admin access" ON tags FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Event tags admin access" ON event_tags FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Outcomes admin access" ON outcomes FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Conditions admin access" ON conditions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "User positions admin access" ON user_position_balances FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Order fills admin access" ON order_fills FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ============================================================
-- 🔑 CRITICAL: GRANT PERMISSIONS TO SERVICE ROLE
-- ============================================================
-- This is essential for sync operations to work properly
-- RLS policies alone are not sufficient for service_role access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT usage ON SCHEMA public TO service_role;

-- ============================================================
-- 13. 🗂️ STORAGE BUCKET SETUP
-- ============================================================
-- Create bucket for assets
INSERT INTO
  STORAGE.buckets (id, NAME, public)
VALUES
  ('forkast-assets', 'forkast-assets', TRUE) ON CONFLICT (id) DO NOTHING;

-- Public read access for all files
DO $$
    begin
        if not exists ( select 1
                        from pg_policies
                        where policyname = 'Public read access'
                          and tablename = 'objects'
                          and schemaname = 'storage' ) then create policy "Public read access" on storage.objects for select to public using (bucket_id = 'forkast-assets');
        end if;
    end
$$;

-- Service role full access (for sync scripts)
DO $$
    begin
        if not exists ( select 1
                        from pg_policies
                        where policyname = 'Service role full access'
                          and tablename = 'objects'
                          and schemaname = 'storage' ) then create policy "Service role full access" on storage.objects for all to service_role using (bucket_id = 'forkast-assets') with check (bucket_id = 'forkast-assets');
        end if;
    end
$$;

-- ============================================================
-- 🎯 COMPLETE SETUP FINISHED!
-- ============================================================
-- Verify tables created
SELECT
  table_name
FROM
  information_schema.tables
WHERE
  table_schema = 'public'
ORDER BY
  table_name;

-- Verify bucket created
SELECT
  id,
  NAME,
  public
FROM
  STORAGE.buckets
WHERE
  id = 'forkast-assets';
