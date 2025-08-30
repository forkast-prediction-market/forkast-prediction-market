-- ============================================================
-- INITIAL SEED DATA - Application Bootstrap
-- ============================================================
-- Contains: Initial tags, sync configuration, collateral data
-- Views moved to domain files for better organization
-- ============================================================

-- Insert initial sync status for all subgraphs
INSERT INTO sync_status (service_name,
                         subgraph_name,
                         last_processed_block,
                         sync_type,
                         status)
VALUES ('activity_sync', 'activity', 0, 'full', 'idle'),
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
INSERT INTO tags (name, slug, is_main_category, display_order)
VALUES ('Politics', 'politics', TRUE, 1),
       ('Middle East', 'middle-east', TRUE, 2),
       ('Sports', 'sports', TRUE, 3),
       ('Crypto', 'crypto', TRUE, 4),
       ('Tech', 'tech', TRUE, 5),
       ('Culture', 'culture', TRUE, 6),
       ('World', 'world', TRUE, 7),
       ('Economy', 'economy', TRUE, 8),
       ('Trump', 'trump', TRUE, 9),
       ('Elections', 'elections', TRUE, 10),
       ('Mentions', 'mentions', TRUE, 11)
ON CONFLICT (slug) DO NOTHING;

-- Insert sub-tags of Sports
INSERT INTO tags (name,
                  slug,
                  is_main_category,
                  parent_tag_id,
                  display_order)
VALUES ('Tennis',
        'tennis',
        FALSE,
        (SELECT id FROM tags WHERE slug = 'sports'),
        1),
       ('Football',
        'football',
        FALSE,
        (SELECT id FROM tags WHERE slug = 'sports'),
        2),
       ('Basketball',
        'basketball',
        FALSE,
        (SELECT id FROM tags WHERE slug = 'sports'),
        3),
       ('Baseball',
        'baseball',
        FALSE,
        (SELECT id FROM tags WHERE slug = 'sports'),
        4)
ON CONFLICT (slug) DO NOTHING;

-- Insert initial collateral token (USDC)
INSERT INTO collaterals (id, name, symbol, decimals)
VALUES ('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        'USD Coin',
        'USDC',
        6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 🔍 VALIDATION QUERIES
-- ============================================================

-- Verify tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify bucket created
SELECT id,
       name,
       public
FROM storage.buckets
WHERE id = 'forkast-assets';

-- Verify all tables have RLS enabled
SELECT t.schemaname,
       t.tablename,
       t.rowsecurity AS rls_enabled,
       CASE
         WHEN t.rowsecurity THEN 'RLS Enabled ✅'
         ELSE 'RLS Missing ❌'
         END         AS status
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- Verify policies exist for each table
SELECT t.schemaname,
       t.tablename,
       COUNT(pol.*) AS policy_count,
       CASE
         WHEN COUNT(pol.*) > 0 THEN 'Has Policies ✅'
         ELSE 'No Policies ❌'
         END        AS policy_status
FROM pg_tables t
       LEFT JOIN pg_policies pol ON t.tablename = pol.tablename AND t.schemaname = pol.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename
ORDER BY t.tablename;

-- List all RLS policies for review
SELECT pol.schemaname,
       pol.tablename,
       pol.policyname,
       pol.permissive,
       pol.roles,
       pol.cmd,
       pol.qual,
       pol.with_check
FROM pg_policies pol
WHERE pol.schemaname = 'public'
ORDER BY pol.tablename, pol.policyname;

-- ============================================================
-- END OF SEED DATA
-- Views moved to respective domain files for better organization
-- ============================================================
