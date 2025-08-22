-- 004.undo.sql - Remove Database Views and Row Level Security
-- Drops all views and RLS policies created in 004.do.sql

-- Drop all policies
DROP POLICY IF EXISTS "Order fills admin access" ON order_fills;
DROP POLICY IF EXISTS "User positions admin access" ON user_position_balances;
DROP POLICY IF EXISTS "Conditions admin access" ON conditions;
DROP POLICY IF EXISTS "Outcomes admin access" ON outcomes;
DROP POLICY IF EXISTS "Event tags admin access" ON event_tags;
DROP POLICY IF EXISTS "Tags admin access" ON tags;
DROP POLICY IF EXISTS "Events admin access" ON events;
DROP POLICY IF EXISTS "Markets admin access" ON markets;

DROP POLICY IF EXISTS "service_role_all_wallets" ON wallets;
DROP POLICY IF EXISTS "service_role_all_global_usdc_balance" ON global_usdc_balance;
DROP POLICY IF EXISTS "service_role_all_fpmm_pool_memberships" ON fpmm_pool_memberships;
DROP POLICY IF EXISTS "service_role_all_collaterals" ON collaterals;
DROP POLICY IF EXISTS "service_role_all_fpmms" ON fpmms;
DROP POLICY IF EXISTS "service_role_all_sports_markets" ON sports_markets;
DROP POLICY IF EXISTS "service_role_all_sports_games" ON sports_games;
DROP POLICY IF EXISTS "service_role_all_market_resolutions" ON market_resolutions;
DROP POLICY IF EXISTS "service_role_all_redemptions" ON redemptions;
DROP POLICY IF EXISTS "service_role_all_position_merges" ON position_merges;
DROP POLICY IF EXISTS "service_role_all_position_splits" ON position_splits;
DROP POLICY IF EXISTS "service_role_all_global_open_interest" ON global_open_interest;
DROP POLICY IF EXISTS "service_role_all_market_open_interest" ON market_open_interest;
DROP POLICY IF EXISTS "service_role_all_orders_matched_global" ON orders_matched_global;

DROP POLICY IF EXISTS "service_role_all_order_fills" ON order_fills;
DROP POLICY IF EXISTS "service_role_all_user_positions" ON user_position_balances;
DROP POLICY IF EXISTS "service_role_all_outcomes" ON outcomes;
DROP POLICY IF EXISTS "service_role_all_event_tags" ON event_tags;
DROP POLICY IF EXISTS "service_role_all_tags" ON tags;
DROP POLICY IF EXISTS "service_role_all_events" ON events;
DROP POLICY IF EXISTS "service_role_all_markets" ON markets;
DROP POLICY IF EXISTS "service_role_all_conditions" ON conditions;
DROP POLICY IF EXISTS "service_role_all_sync_status" ON sync_status;

DROP POLICY IF EXISTS "Sync status for service role" ON sync_status;
DROP POLICY IF EXISTS "Users can see own positions" ON user_position_balances;

DROP POLICY IF EXISTS "Wallets are public" ON wallets;
DROP POLICY IF EXISTS "Global USDC balance is public" ON global_usdc_balance;
DROP POLICY IF EXISTS "FPMM pool memberships are public" ON fpmm_pool_memberships;
DROP POLICY IF EXISTS "Collaterals are public" ON collaterals;
DROP POLICY IF EXISTS "FPMMs are public" ON fpmms;
DROP POLICY IF EXISTS "Sports markets are public" ON sports_markets;
DROP POLICY IF EXISTS "Sports games are public" ON sports_games;
DROP POLICY IF EXISTS "Market resolutions are public" ON market_resolutions;
DROP POLICY IF EXISTS "Redemptions are public" ON redemptions;
DROP POLICY IF EXISTS "Position merges are public" ON position_merges;
DROP POLICY IF EXISTS "Position splits are public" ON position_splits;
DROP POLICY IF EXISTS "Global open interest is public" ON global_open_interest;
DROP POLICY IF EXISTS "Market open interest is public" ON market_open_interest;
DROP POLICY IF EXISTS "Orders matched global are public" ON orders_matched_global;

DROP POLICY IF EXISTS "Order fills are public" ON order_fills;
DROP POLICY IF EXISTS "Conditions are public" ON conditions;
DROP POLICY IF EXISTS "Outcomes are public" ON outcomes;
DROP POLICY IF EXISTS "Event tags are public" ON event_tags;
DROP POLICY IF EXISTS "Tags are public" ON tags;
DROP POLICY IF EXISTS "Events are public" ON events;
DROP POLICY IF EXISTS "Markets are public" ON markets;

-- Disable RLS on all tables
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_usdc_balance DISABLE ROW LEVEL SECURITY;
ALTER TABLE fpmm_pool_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE collaterals DISABLE ROW LEVEL SECURITY;
ALTER TABLE fpmms DISABLE ROW LEVEL SECURITY;
ALTER TABLE sports_markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE sports_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_resolutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE position_merges DISABLE ROW LEVEL SECURITY;
ALTER TABLE position_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_open_interest DISABLE ROW LEVEL SECURITY;
ALTER TABLE market_open_interest DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders_matched_global DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_fills DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_position_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE conditions DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE markets DISABLE ROW LEVEL SECURITY;

-- Drop views
DROP VIEW IF EXISTS v_user_positions_full;
DROP VIEW IF EXISTS v_tags_with_counts;
DROP VIEW IF EXISTS v_markets_full;
