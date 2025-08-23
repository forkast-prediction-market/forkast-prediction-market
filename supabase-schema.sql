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
create table if not exists conditions
(
    id                     VARCHAR(66) primary key, -- condition_id from blockchain (0x...)
    oracle                 VARCHAR(42) not null,    -- Oracle address
    question_id            VARCHAR(66) not null,    -- Question ID from UMA
    outcome_slot_count     INTEGER     not null check (outcome_slot_count >= 2),

    -- Resolution data
    resolved               BOOLEAN         default false,
    payout_numerators      BIGINT[],
    payout_denominator     BIGINT,

    -- Metadata
    arweave_hash           TEXT,                    -- Arweave metadata hash
    creator                VARCHAR(42),             -- Market creator address

    -- Cached aggregations for performance
    total_volume           DECIMAL(20, 6)  default 0,
    open_interest          DECIMAL(30, 18) default 0,
    active_positions_count INTEGER         default 0,

    -- Timestamps
    created_at             TIMESTAMPTZ     default now(),
    resolved_at            TIMESTAMPTZ,
    updated_at             TIMESTAMPTZ     default now()
);

-- User Position Balances - From PnL subgraph
create table if not exists user_position_balances
(
    id                     TEXT primary key,         -- user_address + token_id
    user_address           VARCHAR(42)     not null,
    token_id               TEXT            not null, -- ERC1155 token ID (String from subgraph)
    condition_id           VARCHAR(66)     not null references conditions (id) on delete cascade,
    outcome_index          INTEGER         not null,

    -- Balance data (18 decimals for tokens)
    balance                DECIMAL(30, 18) not null default 0,
    wrapped_balance        DECIMAL(30, 18) not null default 0,

    -- Cost basis and PnL (6 decimals for USDC)
    total_cost             DECIMAL(20, 6)  not null default 0,
    realized_pnl           DECIMAL(20, 6)  not null default 0,
    unrealized_pnl         DECIMAL(20, 6)  not null default 0,

    -- Timestamps
    last_updated_timestamp TIMESTAMPTZ     not null,
    created_at             TIMESTAMPTZ              default now(),

    -- Constraints
    check (outcome_index >= 0),
    check (balance >= 0),
    check (wrapped_balance >= 0)
);

-- Order Fills - From PnL and Orderbook subgraphs
create table if not exists order_fills
(
    id                  TEXT primary key, -- transaction_hash + log_index
    transaction_hash    VARCHAR(66)     not null,
    order_hash          VARCHAR(66),      -- From orderbook subgraph
    block_number        BIGINT          not null,
    timestamp           TIMESTAMPTZ     not null,

    -- Trading parties
    maker               VARCHAR(42)     not null,
    taker               VARCHAR(42)     not null,

    -- Asset details
    maker_asset_id      TEXT            not null,
    taker_asset_id      TEXT            not null,
    maker_amount_filled DECIMAL(30, 18) not null,
    taker_amount_filled DECIMAL(30, 18) not null,

    -- Fee and pricing
    fee                 DECIMAL(20, 6)  not null default 0,
    price               DECIMAL(8, 4),    -- Calculated price for display

    -- Market context (derived from asset IDs)
    condition_id        VARCHAR(66) references conditions (id),
    outcome_index       INTEGER,

    created_at          TIMESTAMPTZ              default now(),

    -- Constraints
    check (maker_amount_filled > 0),
    check (taker_amount_filled > 0),
    check (fee >= 0)
);

-- Global Orders Matched - From Orderbook subgraph
create table if not exists orders_matched_global
(
    id                            TEXT primary key default '',
    trades_quantity               BIGINT           default 0,
    buys_quantity                 BIGINT           default 0,
    sells_quantity                BIGINT           default 0,
    collateral_volume             DECIMAL(20, 6)   default 0,
    scaled_collateral_volume      DECIMAL(20, 6)   default 0,
    collateral_buy_volume         DECIMAL(20, 6)   default 0,
    scaled_collateral_buy_volume  DECIMAL(20, 6)   default 0,
    collateral_sell_volume        DECIMAL(20, 6)   default 0,
    scaled_collateral_sell_volume DECIMAL(20, 6)   default 0,

    last_updated                  TIMESTAMPTZ      default now(),

    check (trades_quantity >= 0),
    check (buys_quantity >= 0),
    check (sells_quantity >= 0)
);

-- Market Open Interest - From OI subgraph
create table if not exists market_open_interest
(
    condition_id VARCHAR(66) primary key references conditions (id) on delete cascade,
    amount       DECIMAL(30, 18) not null default 0,
    last_updated TIMESTAMPTZ              default now(),

    check (amount >= 0)
);

-- Global Open Interest - From OI subgraph
create table if not exists global_open_interest
(
    id           TEXT primary key         default '',
    amount       DECIMAL(30, 18) not null default 0,
    last_updated TIMESTAMPTZ              default now(),

    check (amount >= 0)
);

-- Position Activity Tables - From Activity subgraph
create table if not exists position_splits
(
    id           VARCHAR(66) primary key, -- transaction hash
    timestamp    TIMESTAMPTZ     not null,
    stakeholder  VARCHAR(42)     not null,
    condition_id VARCHAR(66)     not null references conditions (id) on delete cascade,
    amount       DECIMAL(30, 18) not null,

    created_at   TIMESTAMPTZ default now(),
    check (amount > 0)
);

create table if not exists position_merges
(
    id           VARCHAR(66) primary key, -- transaction hash
    timestamp    TIMESTAMPTZ     not null,
    stakeholder  VARCHAR(42)     not null,
    condition_id VARCHAR(66)     not null references conditions (id) on delete cascade,
    amount       DECIMAL(30, 18) not null,

    created_at   TIMESTAMPTZ default now(),
    check (amount > 0)
);

create table if not exists redemptions
(
    id           VARCHAR(66) primary key, -- transaction hash
    timestamp    TIMESTAMPTZ     not null,
    redeemer     VARCHAR(42)     not null,
    condition_id VARCHAR(66)     not null references conditions (id) on delete cascade,
    index_sets   BIGINT[]        not null,
    payout       DECIMAL(30, 18) not null,

    created_at   TIMESTAMPTZ default now(),
    check (payout >= 0)
);

-- Market Resolutions - From Resolution subgraph
create table if not exists market_resolutions
(
    question_id           VARCHAR(66) primary key,
    condition_id          VARCHAR(66) references conditions (id),

    -- Resolution metadata
    author                VARCHAR(42) not null,
    ancillary_data        BYTEA       not null,
    last_update_timestamp TIMESTAMPTZ not null,

    -- Status tracking
    status                VARCHAR(20) not null default 'initialized',
    was_disputed          BOOLEAN              default false,
    approved              BOOLEAN,

    -- Price data (18 decimals to match UMA precision)
    proposed_price        DECIMAL(30, 18),
    reproposed_price      DECIMAL(30, 18),
    final_price           DECIMAL(30, 18),

    -- Audit trail
    updates               TEXT, -- comma separated updates
    transaction_hash      VARCHAR(66),
    log_index             BIGINT,

    created_at            TIMESTAMPTZ          default now(),
    updated_at            TIMESTAMPTZ          default now(),

    check (status in ('initialized', 'posed', 'proposed', 'challenged', 'reproposed', 'disputed', 'resolved'))
);

-- Sports Oracle Tables
create table if not exists sports_games
(
    id             TEXT primary key,
    ancillary_data TEXT        not null,
    ordering       TEXT        not null,
    state          VARCHAR(20) not null,
    home_score     BIGINT      default 0,
    away_score     BIGINT      default 0,

    created_at     TIMESTAMPTZ default now(),
    updated_at     TIMESTAMPTZ default now(),

    check (home_score >= 0),
    check (away_score >= 0)
);

create table if not exists sports_markets
(
    id           TEXT primary key,
    game_id      TEXT        not null references sports_games (id) on delete cascade,
    condition_id VARCHAR(66) references conditions (id),

    state        VARCHAR(20) not null,
    market_type  VARCHAR(50) not null,
    underdog     VARCHAR(10), -- 'home' or 'away'
    line         BIGINT,
    payouts      BIGINT[],

    created_at   TIMESTAMPTZ default now(),
    updated_at   TIMESTAMPTZ default now(),

    check (underdog is null or underdog in ('home', 'away'))
);

-- Collateral Tokens - From FPMM subgraph
create table if not exists collaterals
(
    id         VARCHAR(42) primary key, -- Token address
    name       TEXT    not null,
    symbol     TEXT    not null,
    decimals   INTEGER not null,

    created_at TIMESTAMPTZ default now(),

    check (decimals >= 0)
);

-- FPMM Tables - From FPMM subgraph
create table if not exists fpmms
(
    id                            VARCHAR(42) primary key, -- FPMM address
    condition_id                  VARCHAR(66) references conditions (id),
    creator                       VARCHAR(42)     not null,
    creation_timestamp            TIMESTAMPTZ     not null,
    creation_transaction_hash     VARCHAR(66)     not null,

    -- Token configuration
    collateral_token_address      VARCHAR(42)     not null references collaterals (id),
    conditional_token_address     VARCHAR(42)     not null,
    fee                           DECIMAL(30, 18) not null,

    -- Trading metrics
    trades_quantity               BIGINT          default 0,
    buys_quantity                 BIGINT          default 0,
    sells_quantity                BIGINT          default 0,
    liquidity_add_quantity        BIGINT          default 0,
    liquidity_remove_quantity     BIGINT          default 0,

    -- Volume metrics (18 decimals for raw, 6 for scaled USDC)
    collateral_volume             DECIMAL(30, 18) default 0,
    scaled_collateral_volume      DECIMAL(20, 6)  default 0,
    collateral_buy_volume         DECIMAL(30, 18) default 0,
    scaled_collateral_buy_volume  DECIMAL(20, 6)  default 0,
    collateral_sell_volume        DECIMAL(30, 18) default 0,
    scaled_collateral_sell_volume DECIMAL(20, 6)  default 0,
    fee_volume                    DECIMAL(30, 18) default 0,
    scaled_fee_volume             DECIMAL(20, 6)  default 0,

    -- Liquidity data
    liquidity_parameter           DECIMAL(30, 18) default 0,
    scaled_liquidity_parameter    DECIMAL(20, 6)  default 0,
    outcome_token_amounts         DECIMAL(30, 18)[],
    outcome_token_prices          DECIMAL(8, 4)[],
    outcome_slot_count            INTEGER,
    total_supply                  DECIMAL(30, 18) default 0,

    last_active_day               TIMESTAMPTZ,
    created_at                    TIMESTAMPTZ     default now(),
    updated_at                    TIMESTAMPTZ     default now(),

    check (fee >= 0),
    check (trades_quantity >= 0),
    check (outcome_slot_count is null or outcome_slot_count >= 2)
);

-- FPMM Pool Memberships - From FPMM subgraph
create table if not exists fpmm_pool_memberships
(
    id         TEXT primary key, -- funder + pool address
    fpmm_id    VARCHAR(42)     not null references fpmms (id) on delete cascade,
    funder     VARCHAR(42)     not null,
    amount     DECIMAL(30, 18) not null default 0,

    created_at TIMESTAMPTZ              default now(),
    updated_at TIMESTAMPTZ              default now(),

    check (amount >= 0),
    unique (fpmm_id, funder)
);

create table if not exists global_usdc_balance
(
    id           TEXT primary key        default '',
    balance      DECIMAL(20, 6) not null default 0,
    last_updated TIMESTAMPTZ             default now(),

    check (balance >= 0)
);

create table if not exists users
(
    id             integer generated always as identity primary key,
    address        text unique,
    username       text unique,
    email          text    not null unique,
    email_verified boolean not null default false,
    bio            text,
    image          text,
    created_at     TIMESTAMPTZ      default now(),
    updated_at     TIMESTAMPTZ      default now()
);

create table if not exists sessions
(
    id         integer generated always as identity primary key,
    expires_at timestamp not null,
    token      text      not null unique,
    ip_address text,
    user_agent text,
    user_id    INTEGER   not null references users (id) on delete cascade,
    created_at TIMESTAMPTZ default now(),
    updated_at TIMESTAMPTZ default now()
);

create table if not exists accounts
(
    id                       integer generated always as identity primary key,
    account_id               text    not null,
    provider_id              text    not null,
    user_id                  INTEGER not null references users (id) on delete cascade,
    access_token             text,
    refresh_token            text,
    id_token                 text,
    access_token_expires_at  timestamp,
    refresh_token_expires_at timestamp,
    scope                    text,
    password                 text,
    created_at               TIMESTAMPTZ default now(),
    updated_at               TIMESTAMPTZ default now()
);

create table if not exists verifications
(
    id         integer generated always as identity primary key,
    identifier text      not null,
    value      text      not null,
    expires_at timestamp not null,
    created_at TIMESTAMPTZ default now(),
    updated_at TIMESTAMPTZ default now()
);

create table if not exists wallets
(
    id         integer generated always as identity primary key,
    user_id    integer not null references users (id) on delete cascade,
    address    text    not null,
    balance    DECIMAL(20, 6) default 0,
    chain_id   integer not null,
    is_primary boolean not null,
    created_at TIMESTAMPTZ    default now()
);

-- ============================================================
-- 1. 🏷️ TAGS TABLE
-- ============================================================
create table if not exists tags
(
    id                   SERIAL primary key,
    name                 VARCHAR(100) not null unique,
    slug                 VARCHAR(100) not null unique,
    is_main_category     BOOLEAN     default false,    -- For main menu
    display_order        INTEGER     default 0,        -- Display order
    parent_tag_id        INTEGER references tags (id), -- For hierarchy (Sports > Tennis)
    active_markets_count INTEGER     default 0,        -- Count cache
    created_at           TIMESTAMPTZ default now(),
    updated_at           TIMESTAMPTZ default now()
);

-- ============================================================
-- 2. 🎪 EVENTS TABLE
-- ============================================================
create table if not exists events
(
    id                   SERIAL primary key,
    slug                 VARCHAR(255) not null unique,
    title                TEXT         not null,
    description          TEXT,
    creator              VARCHAR(42),              -- Market creator address (0x...)
    icon_url             TEXT,                     -- events/icons/event-slug.jpg
    show_market_icons    BOOLEAN     default true, -- Field to control the display of market icons
    rules                TEXT,                     -- Rules for market resolution
    active_markets_count INTEGER     default 0,    -- Count cache
    total_markets_count  INTEGER     default 0,    -- Total count cache
    created_at           TIMESTAMPTZ default now(),
    updated_at           TIMESTAMPTZ default now()
);

-- ============================================================
-- 3. 🔗 EVENT-TAG RELATIONSHIP TABLE
-- ============================================================
create table if not exists event_tags
(
    id         SERIAL primary key,
    event_id   INTEGER not null references events (id) on delete cascade,
    tag_id     INTEGER not null references tags (id) on delete cascade,
    created_at TIMESTAMPTZ default now(),
    unique (event_id, tag_id)
);

-- ============================================================
-- 4. 🎯 MARKETS TABLE (ENHANCED WITH SUBGRAPH DATA)
-- ============================================================
create table if not exists markets
(
    -- IDs and Identifiers
    condition_id       VARCHAR(66) primary key references conditions (id) on delete cascade,
    question_id        VARCHAR(66)  not null, -- Derived from conditions table
    oracle             VARCHAR(42)  not null, -- Derived from conditions table

    -- Relationships
    event_id           INTEGER      not null references events (id),

    -- Market Information
    name               TEXT         not null,
    slug               VARCHAR(255) not null,
    description        TEXT,
    short_title        VARCHAR(255),
    outcome_count      INTEGER      not null check (outcome_count >= 2),

    -- Images
    icon_url           TEXT,                  -- markets/icons/market-slug.jpg

    -- Status and Data
    is_active          BOOLEAN         default true,
    is_resolved        BOOLEAN         default false,
    resolution_data    JSONB,                 -- Resolution data when resolved

    -- Blockchain Info
    block_number       BIGINT       not null,
    transaction_hash   VARCHAR(66)  not null,
    block_timestamp    TIMESTAMPTZ  not null,

    -- Metadata
    metadata           JSONB,                 -- Metadata from Arweave

    -- Cached Trading Metrics (from subgraphs)
    current_volume_24h DECIMAL(20, 6)  default 0,
    total_volume       DECIMAL(20, 6)  default 0,
    open_interest      DECIMAL(30, 18) default 0,

    -- Timestamps
    created_at         TIMESTAMPTZ     default now(),
    updated_at         TIMESTAMPTZ     default now(),

    -- Constraints
    unique (event_id, slug),
    check (current_volume_24h >= 0),
    check (total_volume >= 0),
    check (open_interest >= 0)
);

-- ============================================================
-- 5. 🎲 OUTCOMES TABLE (ENHANCED WITH TRADING DATA)
-- ============================================================
create table if not exists outcomes
(
    id                 SERIAL primary key,
    condition_id       VARCHAR(66) not null references conditions (id) on delete cascade,
    outcome_text       TEXT        not null,
    outcome_index      INTEGER     not null,         -- 0, 1, 2... outcome order
    token_id           TEXT        not null,         -- ERC1155 token ID for this outcome

    -- Resolution data
    is_winning_outcome BOOLEAN        default false, -- When resolved
    payout_value       DECIMAL(20, 6),               -- Final payout value

    -- Trading metrics (cached from subgraphs)
    current_price      DECIMAL(8, 4),                -- Current market price (0.0001 to 0.9999)
    volume_24h         DECIMAL(20, 6) default 0,
    total_volume       DECIMAL(20, 6) default 0,

    -- Timestamps
    created_at         TIMESTAMPTZ    default now(),
    updated_at         TIMESTAMPTZ    default now(),

    -- Constraints
    unique (condition_id, outcome_index),
    unique (token_id),
    check (outcome_index >= 0),
    check (current_price is null or (current_price >= 0.0001 and current_price <= 0.9999)),
    check (volume_24h >= 0),
    check (total_volume >= 0),
    check (payout_value is null or payout_value >= 0)
);

-- ============================================================
-- 6. 📊 SYNC STATUS TABLE (ENHANCED FOR MULTIPLE SUBGRAPHS)
-- ============================================================
create table if not exists sync_status
(
    id                   SERIAL primary key,
    service_name         VARCHAR(50) not null,              -- 'activity_sync', 'pnl_sync', etc.
    subgraph_name        VARCHAR(50) not null,              -- 'activity', 'pnl', 'oi', etc.
    last_processed_block BIGINT      default 0,
    last_sync_timestamp  TIMESTAMPTZ default now(),
    sync_type            VARCHAR(20) default 'incremental', -- 'full' or 'incremental'
    status               VARCHAR(20) default 'idle',        -- 'running', 'completed', 'error'
    error_message        TEXT,
    total_processed      INTEGER     default 0,
    processing_rate      DECIMAL(10, 2),                    -- records per second

    created_at           TIMESTAMPTZ default now(),
    updated_at           TIMESTAMPTZ default now(),

    -- Constraints
    unique (service_name, subgraph_name),
    check (status in ('idle', 'running', 'completed', 'error')),
    check (sync_type in ('full', 'incremental')),
    check (total_processed >= 0),
    check (processing_rate is null or processing_rate >= 0)
);

-- ============================================================
-- 7. 📈 PERFORMANCE INDEXES
-- ============================================================

-- Core Foundation Tables Indexes
create index idx_conditions_oracle on conditions (oracle);
create index idx_conditions_question_id on conditions (question_id);
create index idx_conditions_resolved on conditions (resolved);
create index idx_conditions_creator on conditions (creator);
create index idx_conditions_total_volume on conditions (total_volume desc);
create index idx_conditions_open_interest on conditions (open_interest desc);

-- User Position Balances Indexes
create index idx_user_positions_user on user_position_balances (user_address);
create index idx_user_positions_condition on user_position_balances (condition_id);
create index idx_user_positions_token on user_position_balances (token_id);
create index idx_user_positions_user_condition on user_position_balances (user_address, condition_id);
create index idx_user_positions_balance on user_position_balances (balance desc) where balance > 0;
create index idx_user_positions_pnl on user_position_balances (realized_pnl desc);
create index idx_user_positions_updated on user_position_balances (last_updated_timestamp desc);

-- Order Fills Indexes
create index idx_order_fills_timestamp on order_fills (timestamp desc);
create index idx_order_fills_maker on order_fills (maker);
create index idx_order_fills_taker on order_fills (taker);
create index idx_order_fills_condition on order_fills (condition_id);
create index idx_order_fills_tx_hash on order_fills (transaction_hash);
create index idx_order_fills_block on order_fills (block_number);
create index idx_order_fills_maker_timestamp on order_fills (maker, timestamp desc);
create index idx_order_fills_taker_timestamp on order_fills (taker, timestamp desc);
create index idx_order_fills_condition_timestamp on order_fills (condition_id, timestamp desc);

-- Position Activity Indexes
create index idx_splits_timestamp on position_splits (timestamp desc);
create index idx_splits_stakeholder on position_splits (stakeholder);
create index idx_splits_condition on position_splits (condition_id);
create index idx_splits_stakeholder_timestamp on position_splits (stakeholder, timestamp desc);

create index idx_merges_timestamp on position_merges (timestamp desc);
create index idx_merges_stakeholder on position_merges (stakeholder);
create index idx_merges_condition on position_merges (condition_id);
create index idx_merges_stakeholder_timestamp on position_merges (stakeholder, timestamp desc);

create index idx_redemptions_timestamp on redemptions (timestamp desc);
create index idx_redemptions_redeemer on redemptions (redeemer);
create index idx_redemptions_condition on redemptions (condition_id);
create index idx_redemptions_redeemer_timestamp on redemptions (redeemer, timestamp desc);

-- Market Resolution Indexes
create index idx_resolutions_question_id on market_resolutions (question_id);
create index idx_resolutions_condition_id on market_resolutions (condition_id);
create index idx_resolutions_status on market_resolutions (status);
create index idx_resolutions_author on market_resolutions (author);
create index idx_resolutions_timestamp on market_resolutions (last_update_timestamp desc);
create index idx_resolutions_disputed on market_resolutions (was_disputed) where was_disputed = true;

-- Sports Oracle Indexes
create index idx_sports_games_state on sports_games (state);
create index idx_sports_games_ordering on sports_games (ordering);
create index idx_sports_markets_game on sports_markets (game_id);
create index idx_sports_markets_condition on sports_markets (condition_id);
create index idx_sports_markets_type on sports_markets (market_type);

-- FPMM Indexes
create index idx_fpmms_condition on fpmms (condition_id);
create index idx_fpmms_creator on fpmms (creator);
create index idx_fpmms_creation_time on fpmms (creation_timestamp desc);
create index idx_fpmms_volume on fpmms (scaled_collateral_volume desc);
create index idx_fpmms_trades on fpmms (trades_quantity desc);
create index idx_fpmms_active on fpmms (last_active_day desc);

-- Collaterals Indexes
create index idx_collaterals_symbol on collaterals (symbol);
create index idx_collaterals_decimals on collaterals (decimals);

-- FPMM Pool Memberships Indexes
create index idx_fpmm_pool_memberships_fpmm on fpmm_pool_memberships (fpmm_id);
create index idx_fpmm_pool_memberships_funder on fpmm_pool_memberships (funder);
create index idx_fpmm_pool_memberships_amount on fpmm_pool_memberships (amount desc) where amount > 0;

-- Markets - Enhanced indexes
create index idx_markets_event_id on markets (event_id);
create index idx_markets_oracle on markets (oracle);
create index idx_markets_block_number on markets (block_number);
create index idx_markets_is_active on markets (is_active);
create index idx_markets_is_resolved on markets (is_resolved);
create index idx_markets_block_timestamp on markets (block_timestamp);
create index idx_markets_active_unresolved on markets (is_active, is_resolved) where is_active = true and is_resolved = false;
create index idx_markets_volume_24h on markets (current_volume_24h desc);
create index idx_markets_total_volume on markets (total_volume desc);
create index idx_markets_open_interest on markets (open_interest desc);

-- Events - Enhanced indexes
create index idx_events_slug on events (slug);
create index idx_events_creator on events (creator);
create index idx_events_active_markets_count on events (active_markets_count desc);
create index idx_events_total_markets_count on events (total_markets_count desc);

-- Tags - Enhanced indexes
create index idx_tags_slug on tags (slug);
create index idx_tags_is_main_category on tags (is_main_category) where is_main_category = true;
create index idx_tags_display_order on tags (display_order);
create index idx_tags_active_markets_count on tags (active_markets_count desc);
create index idx_tags_parent_tag_id on tags (parent_tag_id);

-- Event_Tags - Indexes
create index idx_event_tags_event_id on event_tags (event_id);
create index idx_event_tags_tag_id on event_tags (tag_id);

-- Outcomes - Enhanced indexes
create index idx_outcomes_condition_id on outcomes (condition_id);
create index idx_outcomes_outcome_index on outcomes (outcome_index);
create index idx_outcomes_is_winning on outcomes (is_winning_outcome) where is_winning_outcome = true;
create index idx_outcomes_token_id on outcomes (token_id);
create index idx_outcomes_current_price on outcomes (current_price desc);
create index idx_outcomes_volume_24h on outcomes (volume_24h desc);
create index idx_outcomes_total_volume on outcomes (total_volume desc);

-- Sync Status - Enhanced indexes
create index idx_sync_status_service_name on sync_status (service_name);
create index idx_sync_status_subgraph_name on sync_status (subgraph_name);
create index idx_sync_status_last_sync on sync_status (last_sync_timestamp);
create index idx_sync_status_status on sync_status (status);

-- ============================================================
-- 8. 🔄 AUTO-UPDATE TRIGGERS
-- ============================================================

-- Function for automatic updated_at
create or replace function update_updated_at_column() returns TRIGGER
    set search_path = 'public' as
$$
begin
    NEW.updated_at = now();
    return NEW;
end;
$$ language 'plpgsql';

-- Triggers for updated_at
create trigger update_tags_updated_at
    before update
    on tags
    for each row
execute function update_updated_at_column();
create trigger update_events_updated_at
    before update
    on events
    for each row
execute function update_updated_at_column();
create trigger update_markets_updated_at
    before update
    on markets
    for each row
execute function update_updated_at_column();
create trigger update_outcomes_updated_at
    before update
    on outcomes
    for each row
execute function update_updated_at_column();
create trigger update_sync_status_updated_at
    before update
    on sync_status
    for each row
execute function update_updated_at_column();
create trigger update_conditions_updated_at
    before update
    on conditions
    for each row
execute function update_updated_at_column();
create trigger update_market_resolutions_updated_at
    before update
    on market_resolutions
    for each row
execute function update_updated_at_column();
create trigger update_sports_games_updated_at
    before update
    on sports_games
    for each row
execute function update_updated_at_column();
create trigger update_sports_markets_updated_at
    before update
    on sports_markets
    for each row
execute function update_updated_at_column();
create trigger update_fpmms_updated_at
    before update
    on fpmms
    for each row
execute function update_updated_at_column();
create trigger update_fpmm_pool_memberships_updated_at
    before update
    on fpmm_pool_memberships
    for each row
execute function update_updated_at_column();
create trigger update_wallets_updated_at
    before update
    on wallets
    for each row
execute function update_updated_at_column();
create trigger update_users_updated_at
    before update
    on users
    for each row
execute function update_updated_at_column();

-- ============================================================
-- 9. 📊 FUNCTIONS FOR COUNTER CACHING
-- ============================================================

-- Function to update active markets count per event
create or replace function update_event_markets_count() returns TRIGGER
    set search_path = 'public' as
$$
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
$$ language 'plpgsql';

-- Trigger for event counters
create trigger trigger_update_event_markets_count
    after insert or update or delete
    on markets
    for each row
execute function update_event_markets_count();

-- Function to update markets count per tag
create or replace function update_tag_markets_count() returns TRIGGER
    set search_path = 'public' as
$$
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
$$ language 'plpgsql';

-- Trigger for tag counters
create trigger trigger_update_tag_markets_count
    after insert or update or delete
    on markets
    for each row
execute function update_tag_markets_count();

create trigger trigger_update_tag_markets_count_event_tags
    after insert or update or delete
    on event_tags
    for each row
execute function update_tag_markets_count();

-- ============================================================
-- 10. 📝 INITIAL DATA INSERTION
-- ============================================================

-- Insert initial sync status for all subgraphs
insert into sync_status (service_name, subgraph_name, last_processed_block, sync_type, status)
values ('activity_sync', 'activity', 0, 'full', 'idle'),
       ('pnl_sync', 'pnl', 0, 'full', 'idle'),
       ('oi_sync', 'oi', 0, 'full', 'idle'),
       ('sports_sync', 'sports', 0, 'full', 'idle'),
       ('fpmm_sync', 'fpmm', 0, 'full', 'idle'),
       ('orderbook_sync', 'orderbook', 0, 'full', 'idle'),
       ('wallet_sync', 'wallet', 0, 'full', 'idle'),
       ('resolution_sync', 'resolution', 0, 'full', 'idle'),
       ('market_sync', 'activity', 0, 'full', 'idle')
on conflict (service_name, subgraph_name) do nothing;

-- Insert initial main tags
insert into tags (name, slug, is_main_category, display_order)
values ('Politics', 'politics', true, 1),
       ('Middle East', 'middle-east', true, 2),
       ('Sports', 'sports', true, 3),
       ('Crypto', 'crypto', true, 4),
       ('Tech', 'tech', true, 5),
       ('Culture', 'culture', true, 6),
       ('World', 'world', true, 7),
       ('Economy', 'economy', true, 8),
       ('Trump', 'trump', true, 9),
       ('Elections', 'elections', true, 10),
       ('Mentions', 'mentions', true, 11)
on conflict (slug) do nothing;

-- Insert sub-tags of Sports
insert into tags (name, slug, is_main_category, parent_tag_id, display_order)
values ('Tennis', 'tennis', false, ( select id from tags where slug = 'sports' ), 1),
       ('Football', 'football', false, ( select id from tags where slug = 'sports' ), 2),
       ('Basketball', 'basketball', false, ( select id from tags where slug = 'sports' ), 3),
       ('Baseball', 'baseball', false, ( select id from tags where slug = 'sports' ), 4)
on conflict (slug) do nothing;

-- Insert initial collateral token (USDC)
insert into collaterals (id, name, symbol, decimals)
values ('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'USD Coin', 'USDC', 6)
on conflict (id) do nothing;

-- ============================================================
-- 11. 🔍 USEFUL VIEWS FOR QUERIES
-- ============================================================

-- View for markets with complete information (security invoker)
create or replace view v_markets_full with (security_invoker = true) as
select m.condition_id,
       m.name                                    as market_name,
       m.slug                                    as market_slug,
       m.outcome_count,
       m.is_active,
       m.is_resolved,
       m.icon_url                                as market_icon_url,
       m.block_number,
       m.block_timestamp,
       m.current_volume_24h,
       m.total_volume,
       m.open_interest,

       e.id                                      as event_id,
       e.title                                   as event_title,
       e.slug                                    as event_slug,
       e.icon_url                                as event_icon_url,

       c.oracle,
       c.question_id,
       c.outcome_slot_count,
       c.resolved,
       c.payout_numerators,
       c.payout_denominator,
       c.arweave_hash,
       c.creator,

       array_agg(distinct t.name)                as tags,
       array_agg(distinct t.slug)                as tag_slugs,

       ( select json_agg(json_build_object('text', o.outcome_text, 'index', o.outcome_index, 'token_id', o.token_id,
                                           'is_winning', o.is_winning_outcome, 'current_price', o.current_price,
                                           'volume_24h', o.volume_24h, 'total_volume', o.total_volume)
                         order by o.outcome_index)
         from outcomes o
         where o.condition_id = m.condition_id ) as outcomes

from markets m
         join events e on m.event_id = e.id
         join conditions c on m.condition_id = c.id
         left join event_tags et on e.id = et.event_id
         left join tags t on et.tag_id = t.id
group by m.condition_id, e.id, c.id;

-- View for tags with counters (security invoker)
create or replace view v_tags_with_counts with (security_invoker = true) as
select t.*,
       coalesce(parent.name, '')                                            as parent_tag_name,
       ( select count(*) from tags child where child.parent_tag_id = t.id ) as child_tags_count
from tags t
         left join tags parent on t.parent_tag_id = parent.id;

-- View for user positions with market context
create or replace view v_user_positions_full with (security_invoker = true) as
select upb.*,
       c.oracle,
       c.question_id,
       c.resolved,
       m.name  as market_name,
       m.slug  as market_slug,
       e.title as event_title,
       o.outcome_text,
       o.current_price
from user_position_balances upb
         join conditions c on upb.condition_id = c.id
         left join markets m on c.id = m.condition_id
         left join events e on m.event_id = e.id
         left join outcomes o on c.id = o.condition_id and upb.outcome_index = o.outcome_index
where upb.balance > 0;

-- ============================================================
-- 12. 🛡️ ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all public tables
alter table markets
    enable row level security;
alter table events
    enable row level security;
alter table tags
    enable row level security;
alter table event_tags
    enable row level security;
alter table outcomes
    enable row level security;
alter table sync_status
    enable row level security;
alter table conditions
    enable row level security;
alter table user_position_balances
    enable row level security;
alter table order_fills
    enable row level security;
alter table orders_matched_global
    enable row level security;
alter table market_open_interest
    enable row level security;
alter table global_open_interest
    enable row level security;
alter table position_splits
    enable row level security;
alter table position_merges
    enable row level security;
alter table redemptions
    enable row level security;
alter table market_resolutions
    enable row level security;
alter table sports_games
    enable row level security;
alter table sports_markets
    enable row level security;
alter table fpmms
    enable row level security;
alter table collaterals
    enable row level security;
alter table fpmm_pool_memberships
    enable row level security;
alter table global_usdc_balance
    enable row level security;
alter table wallets
    enable row level security;

-- Public read policies for anonymous users
create policy "Markets are public" on markets for select to anon using (is_active = true);
create policy "Events are public" on events for select to anon using (true);
create policy "Tags are public" on tags for select to anon using (true);
create policy "Event tags are public" on event_tags for select to anon using (true);
create policy "Outcomes are public" on outcomes for select to anon using (true);
create policy "Conditions are public" on conditions for select to anon using (true);
create policy "Order fills are public" on order_fills for select to anon using (true);

-- Additional public read policies for blockchain data
create policy "Orders matched global are public" on orders_matched_global for select to anon using (true);
create policy "Market open interest is public" on market_open_interest for select to anon using (true);
create policy "Global open interest is public" on global_open_interest for select to anon using (true);
create policy "Position splits are public" on position_splits for select to anon using (true);
create policy "Position merges are public" on position_merges for select to anon using (true);
create policy "Redemptions are public" on redemptions for select to anon using (true);
create policy "Market resolutions are public" on market_resolutions for select to anon using (true);
create policy "Sports games are public" on sports_games for select to anon using (true);
create policy "Sports markets are public" on sports_markets for select to anon using (true);
create policy "FPMMs are public" on fpmms for select to anon using (true);
create policy "Collaterals are public" on collaterals for select to anon using (true);
create policy "FPMM pool memberships are public" on fpmm_pool_memberships for select to anon using (true);
create policy "Global USDC balance is public" on global_usdc_balance for select to anon using (true);
create policy "Wallets are public" on wallets for select to anon using (true);

-- User position balances - users can only see their own
create policy "Users can see own positions" on user_position_balances for select to authenticated using (user_address = auth.jwt() ->> 'wallet_address');

-- Sync status - only for authenticated service role
create policy "Sync status for service role" on sync_status for all to service_role using (true) with check (true);

-- Service role policies (full access for sync operations)
create policy "service_role_all_sync_status" on sync_status for all to service_role using (true) with check (true);
create policy "service_role_all_conditions" on conditions for all to service_role using (true) with check (true);
create policy "service_role_all_markets" on markets for all to service_role using (true) with check (true);
create policy "service_role_all_events" on events for all to service_role using (true) with check (true);
create policy "service_role_all_tags" on tags for all to service_role using (true) with check (true);
create policy "service_role_all_event_tags" on event_tags for all to service_role using (true) with check (true);
create policy "service_role_all_outcomes" on outcomes for all to service_role using (true) with check (true);
create policy "service_role_all_user_positions" on user_position_balances for all to service_role using (true) with check (true);
create policy "service_role_all_order_fills" on order_fills for all to service_role using (true) with check (true);

-- Service role policies for additional tables
create policy "service_role_all_orders_matched_global" on orders_matched_global for all to service_role using (true) with check (true);
create policy "service_role_all_market_open_interest" on market_open_interest for all to service_role using (true) with check (true);
create policy "service_role_all_global_open_interest" on global_open_interest for all to service_role using (true) with check (true);
create policy "service_role_all_position_splits" on position_splits for all to service_role using (true) with check (true);
create policy "service_role_all_position_merges" on position_merges for all to service_role using (true) with check (true);
create policy "service_role_all_redemptions" on redemptions for all to service_role using (true) with check (true);
create policy "service_role_all_market_resolutions" on market_resolutions for all to service_role using (true) with check (true);
create policy "service_role_all_sports_games" on sports_games for all to service_role using (true) with check (true);
create policy "service_role_all_sports_markets" on sports_markets for all to service_role using (true) with check (true);
create policy "service_role_all_fpmms" on fpmms for all to service_role using (true) with check (true);
create policy "service_role_all_collaterals" on collaterals for all to service_role using (true) with check (true);
create policy "service_role_all_fpmm_pool_memberships" on fpmm_pool_memberships for all to service_role using (true) with check (true);
create policy "service_role_all_global_usdc_balance" on global_usdc_balance for all to service_role using (true) with check (true);
create policy "service_role_all_wallets" on wallets for all to service_role using (true) with check (true);

-- Admin policies for authenticated users (if needed)
create policy "Markets admin access" on markets for all to authenticated using (true) with check (true);
create policy "Events admin access" on events for all to authenticated using (true) with check (true);
create policy "Tags admin access" on tags for all to authenticated using (true) with check (true);
create policy "Event tags admin access" on event_tags for all to authenticated using (true) with check (true);
create policy "Outcomes admin access" on outcomes for all to authenticated using (true) with check (true);
create policy "Conditions admin access" on conditions for all to authenticated using (true) with check (true);
create policy "User positions admin access" on user_position_balances for all to authenticated using (true) with check (true);
create policy "Order fills admin access" on order_fills for all to authenticated using (true) with check (true);

-- ============================================================
-- 🔑 CRITICAL: GRANT PERMISSIONS TO SERVICE ROLE
-- ============================================================
-- This is essential for sync operations to work properly
-- RLS policies alone are not sufficient for service_role access

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant usage on schema public to service_role;

-- ============================================================
-- 13. 🗂️ STORAGE BUCKET SETUP
-- ============================================================

-- Create bucket for assets
insert into storage.buckets (id, name, public)
values ('forkast-assets', 'forkast-assets', true)
on conflict (id) do nothing;

-- Public read access for all files
do
$$
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
do
$$
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
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Verify bucket created
select id, name, public
from storage.buckets
where id = 'forkast-assets';


