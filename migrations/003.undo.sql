-- 003.undo.sql - Remove Database Triggers and Functions
-- Drops all triggers and functions created in 003.do.sql

-- Drop triggers for tag counters
DROP TRIGGER IF EXISTS trigger_update_tag_markets_count_event_tags ON event_tags;
DROP TRIGGER IF EXISTS trigger_update_tag_markets_count ON markets;

-- Drop trigger for event counters
DROP TRIGGER IF EXISTS trigger_update_event_markets_count ON markets;

-- Drop triggers for updated_at
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
DROP TRIGGER IF EXISTS update_fpmm_pool_memberships_updated_at ON fpmm_pool_memberships;
DROP TRIGGER IF EXISTS update_fpmms_updated_at ON fpmms;
DROP TRIGGER IF EXISTS update_sports_markets_updated_at ON sports_markets;
DROP TRIGGER IF EXISTS update_sports_games_updated_at ON sports_games;
DROP TRIGGER IF EXISTS update_market_resolutions_updated_at ON market_resolutions;
DROP TRIGGER IF EXISTS update_conditions_updated_at ON conditions;
DROP TRIGGER IF EXISTS update_sync_status_updated_at ON sync_status;
DROP TRIGGER IF EXISTS update_outcomes_updated_at ON outcomes;
DROP TRIGGER IF EXISTS update_markets_updated_at ON markets;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;

-- Drop functions
DROP FUNCTION IF EXISTS update_tag_markets_count();
DROP FUNCTION IF EXISTS update_event_markets_count();
DROP FUNCTION IF EXISTS update_updated_at_column();
