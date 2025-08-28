-- ============================================================
-- 0004_tables_aux.sql - Auxiliary Tables (Auth & Application)
-- ============================================================
-- User authentication and application-specific tables

-- User authentication tables
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  address TEXT UNIQUE,
  username TEXT UNIQUE,
  email CITEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verifications (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  balance DECIMAL(20, 6) DEFAULT 0,
  chain_id INTEGER NOT NULL,
  is_primary BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_main_category BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  parent_tag_id INTEGER REFERENCES tags(id),
  active_markets_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Events table
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

-- Create bookmarks table after events table exists
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- Event-Tag relationship table
CREATE TABLE IF NOT EXISTS event_tags (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, tag_id)
);

-- Markets table (Enhanced with subgraph data)
CREATE TABLE IF NOT EXISTS markets (
  -- IDs and Identifiers
  condition_id VARCHAR(66) PRIMARY KEY REFERENCES conditions(id) ON DELETE CASCADE,
  question_id VARCHAR(66) NOT NULL, -- Derived from conditions table
  oracle VARCHAR(42) NOT NULL, -- Derived from conditions table
  -- Relationships
  event_id INTEGER NOT NULL REFERENCES events(id),
  -- Market Information
  name TEXT NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  short_title VARCHAR(255),
  outcome_count INTEGER NOT NULL CHECK (outcome_count >= 2),
  -- Images
  icon_url TEXT, -- markets/icons/market-slug.jpg
  -- Status and Data
  is_active BOOLEAN DEFAULT TRUE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_data JSONB, -- Resolution data when resolved
  -- Blockchain Info
  block_number BIGINT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  block_timestamp TIMESTAMPTZ NOT NULL,
  -- Metadata
  metadata JSONB, -- Metadata from Arweave
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

-- Outcomes table (Enhanced with trading data)
CREATE TABLE IF NOT EXISTS outcomes (
  id SERIAL PRIMARY KEY,
  condition_id VARCHAR(66) NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  outcome_text TEXT NOT NULL,
  outcome_index INTEGER NOT NULL, -- 0, 1, 2... outcome order
  token_id TEXT NOT NULL, -- ERC1155 token ID for this outcome
  -- Resolution data
  is_winning_outcome BOOLEAN DEFAULT FALSE, -- When resolved
  payout_value DECIMAL(20, 6), -- Final payout value
  -- Trading metrics (cached from subgraphs)
  current_price DECIMAL(8, 4), -- Current market price (0.0001 to 0.9999)
  volume_24h DECIMAL(20, 6) DEFAULT 0,
  total_volume DECIMAL(20, 6) DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Constraints
  UNIQUE (condition_id, outcome_index),
  UNIQUE (token_id),
  CHECK (outcome_index >= 0),
  CHECK (current_price IS NULL OR (current_price >= 0.0001 AND current_price <= 0.9999)),
  CHECK (volume_24h >= 0),
  CHECK (total_volume >= 0),
  CHECK (payout_value IS NULL OR payout_value >= 0)
);

-- Sync status table (Enhanced for multiple subgraphs)
CREATE TABLE IF NOT EXISTS sync_status (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(50) NOT NULL, -- 'activity_sync', 'pnl_sync', etc.
  subgraph_name VARCHAR(50) NOT NULL, -- 'activity', 'pnl', 'oi', etc.
  last_processed_block BIGINT DEFAULT 0,
  last_sync_timestamp TIMESTAMPTZ DEFAULT now(),
  sync_type VARCHAR(20) DEFAULT 'incremental', -- 'full' or 'incremental'
  status VARCHAR(20) DEFAULT 'idle', -- 'running', 'completed', 'error'
  error_message TEXT,
  total_processed INTEGER DEFAULT 0,
  processing_rate DECIMAL(10, 2), -- records per second
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Constraints
  UNIQUE (service_name, subgraph_name),
  CHECK (status IN ('idle', 'running', 'completed', 'error')),
  CHECK (sync_type IN ('full', 'incremental')),
  CHECK (total_processed >= 0),
  CHECK (processing_rate IS NULL OR processing_rate >= 0)
);

-- ============================================================
-- 💬 COMMENTS SYSTEM
-- ============================================================
-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 2000),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comment likes/reactions table
CREATE TABLE IF NOT EXISTS comment_likes (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

-- Comment reports (for moderation)
CREATE TABLE IF NOT EXISTS comment_reports (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'abuse', 'inappropriate', 'other')),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (comment_id, reporter_user_id)
);
