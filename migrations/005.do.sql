-- 005.do.sql - Permissions and Initial Data
-- Grant permissions and insert initial data

-- ============================================================
-- 🔑 CRITICAL: GRANT PERMISSIONS TO SERVICE ROLE
-- ============================================================
-- This is essential for sync operations to work properly
-- RLS policies alone are not sufficient for service_role access

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- ============================================================
-- 📝 INITIAL DATA INSERTION
-- ============================================================

-- Insert initial sync status for all subgraphs
INSERT INTO sync_status (service_name, subgraph_name, last_processed_block, sync_type, status) VALUES
('activity_sync', 'activity', 0, 'full', 'idle'),
('pnl_sync', 'pnl', 0, 'full', 'idle'),
('oi_sync', 'oi', 0, 'full', 'idle'),
('sports_sync', 'sports', 0, 'full', 'idle'),
('fpmm_sync', 'fpmm', 0, 'full', 'idle'),
('orderbook_sync', 'orderbook', 0, 'full', 'idle'),
('wallet_sync', 'wallet', 0, 'full', 'idle'),
('resolution_sync', 'resolution', 0, 'full', 'idle'),
('market_sync', 'activity', 0, 'full', 'idle')
ON CONFLICT (service_name, subgraph_name) DO NOTHING;

-- Insert initial main tags
INSERT INTO tags (name, slug, is_main_category, display_order) VALUES
('Politics', 'politics', true, 1),
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
ON CONFLICT (slug) DO NOTHING;

-- Insert sub-tags of Sports
INSERT INTO tags (name, slug, is_main_category, parent_tag_id, display_order) VALUES
('Tennis', 'tennis', false, (SELECT id FROM tags WHERE slug = 'sports'), 1),
('Football', 'football', false, (SELECT id FROM tags WHERE slug = 'sports'), 2),
('Basketball', 'basketball', false, (SELECT id FROM tags WHERE slug = 'sports'), 3),
('Baseball', 'baseball', false, (SELECT id FROM tags WHERE slug = 'sports'), 4)
ON CONFLICT (slug) DO NOTHING;

-- Insert initial collateral token (USDC)
INSERT INTO collaterals (id, name, symbol, decimals) VALUES
('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'USD Coin', 'USDC', 6)
ON CONFLICT (id) DO NOTHING;
