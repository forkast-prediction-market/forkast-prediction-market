-- 002.undo.sql - Remove Database Indexes
-- Drops all indexes created in 002.do.sql

-- Drop Sync Status indexes
DROP INDEX IF EXISTS idx_sync_status_status;
DROP INDEX IF EXISTS idx_sync_status_last_sync;
DROP INDEX IF EXISTS idx_sync_status_subgraph_name;
DROP INDEX IF EXISTS idx_sync_status_service_name;

-- Drop Outcomes indexes
DROP INDEX IF EXISTS idx_outcomes_total_volume;
DROP INDEX IF EXISTS idx_outcomes_volume_24h;
DROP INDEX IF EXISTS idx_outcomes_current_price;
DROP INDEX IF EXISTS idx_outcomes_token_id;
DROP INDEX IF EXISTS idx_outcomes_is_winning;
DROP INDEX IF EXISTS idx_outcomes_outcome_index;
DROP INDEX IF EXISTS idx_outcomes_condition_id;

-- Drop Event_Tags indexes
DROP INDEX IF EXISTS idx_event_tags_tag_id;
DROP INDEX IF EXISTS idx_event_tags_event_id;

-- Drop Tags indexes
DROP INDEX IF EXISTS idx_tags_parent_tag_id;
DROP INDEX IF EXISTS idx_tags_active_markets_count;
DROP INDEX IF EXISTS idx_tags_display_order;
DROP INDEX IF EXISTS idx_tags_is_main_category;
DROP INDEX IF EXISTS idx_tags_slug;

-- Drop Events indexes
DROP INDEX IF EXISTS idx_events_total_markets_count;
DROP INDEX IF EXISTS idx_events_active_markets_count;
DROP INDEX IF EXISTS idx_events_creator;
DROP INDEX IF EXISTS idx_events_slug;

-- Drop Markets indexes
DROP INDEX IF EXISTS idx_markets_open_interest;
DROP INDEX IF EXISTS idx_markets_total_volume;
DROP INDEX IF EXISTS idx_markets_volume_24h;
DROP INDEX IF EXISTS idx_markets_active_unresolved;
DROP INDEX IF EXISTS idx_markets_block_timestamp;
DROP INDEX IF EXISTS idx_markets_is_resolved;
DROP INDEX IF EXISTS idx_markets_is_active;
DROP INDEX IF EXISTS idx_markets_block_number;
DROP INDEX IF EXISTS idx_markets_oracle;
DROP INDEX IF EXISTS idx_markets_event_id;

-- Drop FPMM Pool Memberships indexes
DROP INDEX IF EXISTS idx_fpmm_pool_memberships_amount;
DROP INDEX IF EXISTS idx_fpmm_pool_memberships_funder;
DROP INDEX IF EXISTS idx_fpmm_pool_memberships_fpmm;

-- Drop Collaterals indexes
DROP INDEX IF EXISTS idx_collaterals_decimals;
DROP INDEX IF EXISTS idx_collaterals_symbol;

-- Drop Wallet indexes
DROP INDEX IF EXISTS idx_wallets_created;
DROP INDEX IF EXISTS idx_wallets_balance;
DROP INDEX IF EXISTS idx_wallets_type;
DROP INDEX IF EXISTS idx_wallets_signer;

-- Drop FPMM indexes
DROP INDEX IF EXISTS idx_fpmms_active;
DROP INDEX IF EXISTS idx_fpmms_trades;
DROP INDEX IF EXISTS idx_fpmms_volume;
DROP INDEX IF EXISTS idx_fpmms_creation_time;
DROP INDEX IF EXISTS idx_fpmms_creator;
DROP INDEX IF EXISTS idx_fpmms_condition;

-- Drop Sports Oracle indexes
DROP INDEX IF EXISTS idx_sports_markets_type;
DROP INDEX IF EXISTS idx_sports_markets_condition;
DROP INDEX IF EXISTS idx_sports_markets_game;
DROP INDEX IF EXISTS idx_sports_games_ordering;
DROP INDEX IF EXISTS idx_sports_games_state;

-- Drop Market Resolution indexes
DROP INDEX IF EXISTS idx_resolutions_disputed;
DROP INDEX IF EXISTS idx_resolutions_timestamp;
DROP INDEX IF EXISTS idx_resolutions_author;
DROP INDEX IF EXISTS idx_resolutions_status;
DROP INDEX IF EXISTS idx_resolutions_condition_id;
DROP INDEX IF EXISTS idx_resolutions_question_id;

-- Drop Position Activity indexes
DROP INDEX IF EXISTS idx_redemptions_redeemer_timestamp;
DROP INDEX IF EXISTS idx_redemptions_condition;
DROP INDEX IF EXISTS idx_redemptions_redeemer;
DROP INDEX IF EXISTS idx_redemptions_timestamp;

DROP INDEX IF EXISTS idx_merges_stakeholder_timestamp;
DROP INDEX IF EXISTS idx_merges_condition;
DROP INDEX IF EXISTS idx_merges_stakeholder;
DROP INDEX IF EXISTS idx_merges_timestamp;

DROP INDEX IF EXISTS idx_splits_stakeholder_timestamp;
DROP INDEX IF EXISTS idx_splits_condition;
DROP INDEX IF EXISTS idx_splits_stakeholder;
DROP INDEX IF EXISTS idx_splits_timestamp;

-- Drop Order Fills indexes
DROP INDEX IF EXISTS idx_order_fills_condition_timestamp;
DROP INDEX IF EXISTS idx_order_fills_taker_timestamp;
DROP INDEX IF EXISTS idx_order_fills_maker_timestamp;
DROP INDEX IF EXISTS idx_order_fills_block;
DROP INDEX IF EXISTS idx_order_fills_tx_hash;
DROP INDEX IF EXISTS idx_order_fills_condition;
DROP INDEX IF EXISTS idx_order_fills_taker;
DROP INDEX IF EXISTS idx_order_fills_maker;
DROP INDEX IF EXISTS idx_order_fills_timestamp;

-- Drop User Position Balances indexes
DROP INDEX IF EXISTS idx_user_positions_updated;
DROP INDEX IF EXISTS idx_user_positions_pnl;
DROP INDEX IF EXISTS idx_user_positions_balance;
DROP INDEX IF EXISTS idx_user_positions_user_condition;
DROP INDEX IF EXISTS idx_user_positions_token;
DROP INDEX IF EXISTS idx_user_positions_condition;
DROP INDEX IF EXISTS idx_user_positions_user;

-- Drop Core Foundation Tables indexes
DROP INDEX IF EXISTS idx_conditions_open_interest;
DROP INDEX IF EXISTS idx_conditions_total_volume;
DROP INDEX IF EXISTS idx_conditions_creator;
DROP INDEX IF EXISTS idx_conditions_resolved;
DROP INDEX IF EXISTS idx_conditions_question_id;
DROP INDEX IF EXISTS idx_conditions_oracle;
