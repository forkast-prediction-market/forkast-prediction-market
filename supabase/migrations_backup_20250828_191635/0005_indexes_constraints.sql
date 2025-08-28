-- ============================================================
-- 0005_indexes_constraints.sql - Performance Indexes
-- ============================================================
-- Create indexes for optimal performance

-- Core Foundation Tables Indexes
CREATE INDEX IF NOT EXISTS idx_conditions_oracle ON conditions(oracle);
CREATE INDEX IF NOT EXISTS idx_conditions_question_id ON conditions(question_id);
CREATE INDEX IF NOT EXISTS idx_conditions_resolved ON conditions(resolved);
CREATE INDEX IF NOT EXISTS idx_conditions_creator ON conditions(creator);
CREATE INDEX IF NOT EXISTS idx_conditions_total_volume ON conditions(total_volume DESC);
CREATE INDEX IF NOT EXISTS idx_conditions_open_interest ON conditions(open_interest DESC);

-- User Position Balances Indexes
CREATE INDEX IF NOT EXISTS idx_user_positions_user ON user_position_balances(user_address);
CREATE INDEX IF NOT EXISTS idx_user_positions_condition ON user_position_balances(condition_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_token ON user_position_balances(token_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_user_condition ON user_position_balances(user_address, condition_id);
CREATE INDEX IF NOT EXISTS idx_user_positions_balance ON user_position_balances(balance DESC) WHERE balance > 0;
CREATE INDEX IF NOT EXISTS idx_user_positions_pnl ON user_position_balances(realized_pnl DESC);
CREATE INDEX IF NOT EXISTS idx_user_positions_updated ON user_position_balances(last_updated_timestamp DESC);

-- Order Fills Indexes
CREATE INDEX IF NOT EXISTS idx_order_fills_timestamp ON order_fills(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_fills_maker ON order_fills(maker);
CREATE INDEX IF NOT EXISTS idx_order_fills_taker ON order_fills(taker);
CREATE INDEX IF NOT EXISTS idx_order_fills_condition ON order_fills(condition_id);
CREATE INDEX IF NOT EXISTS idx_order_fills_tx_hash ON order_fills(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_order_fills_block ON order_fills(block_number);
CREATE INDEX IF NOT EXISTS idx_order_fills_maker_timestamp ON order_fills(maker, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_fills_taker_timestamp ON order_fills(taker, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_fills_condition_timestamp ON order_fills(condition_id, timestamp DESC);

-- Position Activity Indexes
CREATE INDEX IF NOT EXISTS idx_splits_timestamp ON position_splits(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_splits_stakeholder ON position_splits(stakeholder);
CREATE INDEX IF NOT EXISTS idx_splits_condition ON position_splits(condition_id);
CREATE INDEX IF NOT EXISTS idx_splits_stakeholder_timestamp ON position_splits(stakeholder, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_merges_timestamp ON position_merges(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_merges_stakeholder ON position_merges(stakeholder);
CREATE INDEX IF NOT EXISTS idx_merges_condition ON position_merges(condition_id);
CREATE INDEX IF NOT EXISTS idx_merges_stakeholder_timestamp ON position_merges(stakeholder, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_redemptions_timestamp ON redemptions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemer ON redemptions(redeemer);
CREATE INDEX IF NOT EXISTS idx_redemptions_condition ON redemptions(condition_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemer_timestamp ON redemptions(redeemer, timestamp DESC);

-- Market Resolution Indexes
CREATE INDEX IF NOT EXISTS idx_resolutions_question_id ON market_resolutions(question_id);
CREATE INDEX IF NOT EXISTS idx_resolutions_condition_id ON market_resolutions(condition_id);
CREATE INDEX IF NOT EXISTS idx_resolutions_status ON market_resolutions(status);
CREATE INDEX IF NOT EXISTS idx_resolutions_author ON market_resolutions(author);
CREATE INDEX IF NOT EXISTS idx_resolutions_timestamp ON market_resolutions(last_update_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_resolutions_disputed ON market_resolutions(was_disputed) WHERE was_disputed = TRUE;

-- Sports Oracle Indexes
CREATE INDEX IF NOT EXISTS idx_sports_games_state ON sports_games(state);
CREATE INDEX IF NOT EXISTS idx_sports_games_ordering ON sports_games(ordering);
CREATE INDEX IF NOT EXISTS idx_sports_markets_game ON sports_markets(game_id);
CREATE INDEX IF NOT EXISTS idx_sports_markets_condition ON sports_markets(condition_id);
CREATE INDEX IF NOT EXISTS idx_sports_markets_type ON sports_markets(market_type);

-- FPMM Indexes
CREATE INDEX IF NOT EXISTS idx_fpmms_condition ON fpmms(condition_id);
CREATE INDEX IF NOT EXISTS idx_fpmms_creator ON fpmms(creator);
CREATE INDEX IF NOT EXISTS idx_fpmms_creation_time ON fpmms(creation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_fpmms_volume ON fpmms(scaled_collateral_volume DESC);
CREATE INDEX IF NOT EXISTS idx_fpmms_trades ON fpmms(trades_quantity DESC);
CREATE INDEX IF NOT EXISTS idx_fpmms_active ON fpmms(last_active_day DESC);

-- Collaterals Indexes
CREATE INDEX IF NOT EXISTS idx_collaterals_symbol ON collaterals(symbol);
CREATE INDEX IF NOT EXISTS idx_collaterals_decimals ON collaterals(decimals);

-- FPMM Pool Memberships Indexes
CREATE INDEX IF NOT EXISTS idx_fpmm_pool_memberships_fpmm ON fpmm_pool_memberships(fpmm_id);
CREATE INDEX IF NOT EXISTS idx_fpmm_pool_memberships_funder ON fpmm_pool_memberships(funder);
CREATE INDEX IF NOT EXISTS idx_fpmm_pool_memberships_amount ON fpmm_pool_memberships(amount DESC) WHERE amount > 0;

-- Markets - Enhanced indexes
CREATE INDEX IF NOT EXISTS idx_markets_event_id ON markets(event_id);
CREATE INDEX IF NOT EXISTS idx_markets_oracle ON markets(oracle);
CREATE INDEX IF NOT EXISTS idx_markets_block_number ON markets(block_number);
CREATE INDEX IF NOT EXISTS idx_markets_is_active ON markets(is_active);
CREATE INDEX IF NOT EXISTS idx_markets_is_resolved ON markets(is_resolved);
CREATE INDEX IF NOT EXISTS idx_markets_block_timestamp ON markets(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_markets_active_unresolved ON markets(is_active, is_resolved) WHERE is_active = TRUE AND is_resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_markets_volume_24h ON markets(current_volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_markets_total_volume ON markets(total_volume DESC);
CREATE INDEX IF NOT EXISTS idx_markets_open_interest ON markets(open_interest DESC);

-- Events - Enhanced indexes
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(creator);
CREATE INDEX IF NOT EXISTS idx_events_active_markets_count ON events(active_markets_count DESC);
CREATE INDEX IF NOT EXISTS idx_events_total_markets_count ON events(total_markets_count DESC);

-- Tags - Enhanced indexes
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_is_main_category ON tags(is_main_category) WHERE is_main_category = TRUE;
CREATE INDEX IF NOT EXISTS idx_tags_display_order ON tags(display_order);
CREATE INDEX IF NOT EXISTS idx_tags_active_markets_count ON tags(active_markets_count DESC);
CREATE INDEX IF NOT EXISTS idx_tags_parent_tag_id ON tags(parent_tag_id);

-- Event_Tags - Indexes
CREATE INDEX IF NOT EXISTS idx_event_tags_event_id ON event_tags(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tags_tag_id ON event_tags(tag_id);

-- Outcomes - Enhanced indexes
CREATE INDEX IF NOT EXISTS idx_outcomes_condition_id ON outcomes(condition_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_outcome_index ON outcomes(outcome_index);
CREATE INDEX IF NOT EXISTS idx_outcomes_is_winning ON outcomes(is_winning_outcome) WHERE is_winning_outcome = TRUE;
CREATE INDEX IF NOT EXISTS idx_outcomes_token_id ON outcomes(token_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_current_price ON outcomes(current_price DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_volume_24h ON outcomes(volume_24h DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_total_volume ON outcomes(total_volume DESC);

-- Sync Status - Enhanced indexes
CREATE INDEX IF NOT EXISTS idx_sync_status_service_name ON sync_status(service_name);
CREATE INDEX IF NOT EXISTS idx_sync_status_subgraph_name ON sync_status(subgraph_name);
CREATE INDEX IF NOT EXISTS idx_sync_status_last_sync ON sync_status(last_sync_timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_status_status ON sync_status(status);

-- User authentication table indexes
CREATE INDEX IF NOT EXISTS idx_users_address ON users(address);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_provider_id ON accounts(provider_id);

CREATE INDEX IF NOT EXISTS idx_verifications_identifier ON verifications(identifier);
CREATE INDEX IF NOT EXISTS idx_verifications_expires_at ON verifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_chain_id ON wallets(chain_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_event_id ON bookmarks(event_id);

-- Comments - Optimized indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_event_id ON comments(event_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_event_created ON comments(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_created ON comments(parent_comment_id, created_at ASC) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_root_popular ON comments(event_id, likes_count DESC, created_at DESC) WHERE parent_comment_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_not_deleted ON comments(event_id, created_at DESC) WHERE is_deleted = FALSE;

-- Comment likes - Indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Comment reports - Indexes
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_status ON comment_reports(status) WHERE status = 'pending';
