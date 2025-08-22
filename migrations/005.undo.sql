-- 005.undo.sql - Remove Permissions and Initial Data
-- Revokes permissions and removes initial data

-- Remove initial data (in reverse order)
DELETE FROM collaterals WHERE id = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

DELETE FROM tags WHERE slug IN ('tennis', 'football', 'basketball', 'baseball');

DELETE FROM tags WHERE slug IN ('politics', 'middle-east', 'sports', 'crypto', 'tech', 'culture', 'world', 'economy', 'trump', 'elections', 'mentions');

DELETE FROM sync_status WHERE service_name IN ('activity_sync', 'pnl_sync', 'oi_sync', 'sports_sync', 'fpmm_sync', 'orderbook_sync', 'wallet_sync', 'resolution_sync', 'market_sync');

-- Revoke permissions from service_role
REVOKE USAGE ON SCHEMA public FROM service_role;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM service_role;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM service_role;
