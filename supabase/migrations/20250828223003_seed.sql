-- ============================================================
-- 0010_seed.sql - Initial Data Insertion
-- ============================================================
-- Insert initial seed data for the application

-- Insert initial sync status for all subgraphs
INSERT INTO sync_status (
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
  ('market_sync', 'activity', 0, 'full', 'idle')
ON CONFLICT (service_name, subgraph_name) DO NOTHING;

-- Insert initial main tags
INSERT INTO tags (name, slug, is_main_category, display_order)
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
  ('Mentions', 'mentions', TRUE, 11)
ON CONFLICT (slug) DO NOTHING;

-- Insert sub-tags of Sports
INSERT INTO tags (
  name,
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
    (SELECT id FROM tags WHERE slug = 'sports'),
    1
  ),
  (
    'Football',
    'football',
    FALSE,
    (SELECT id FROM tags WHERE slug = 'sports'),
    2
  ),
  (
    'Basketball',
    'basketball',
    FALSE,
    (SELECT id FROM tags WHERE slug = 'sports'),
    3
  ),
  (
    'Baseball',
    'baseball',
    FALSE,
    (SELECT id FROM tags WHERE slug = 'sports'),
    4
  )
ON CONFLICT (slug) DO NOTHING;

-- Insert initial collateral token (USDC)
INSERT INTO collaterals (id, name, symbol, decimals)
VALUES
  (
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    'USD Coin',
    'USDC',
    6
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 🔍 USEFUL VIEWS FOR QUERIES
-- ============================================================
-- View for markets with complete information (security invoker)
CREATE OR REPLACE VIEW v_markets_full WITH (security_invoker = TRUE) AS
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
    SELECT json_agg(
      json_build_object(
        'text', o.outcome_text,
        'index', o.outcome_index,
        'token_id', o.token_id,
        'is_winning', o.is_winning_outcome,
        'current_price', o.current_price,
        'volume_24h', o.volume_24h,
        'total_volume', o.total_volume
      )
      ORDER BY o.outcome_index
    )
    FROM outcomes o
    WHERE o.condition_id = m.condition_id
  ) AS outcomes
FROM markets m
JOIN events e ON m.event_id = e.id
JOIN conditions c ON m.condition_id = c.id
LEFT JOIN event_tags et ON e.id = et.event_id
LEFT JOIN tags t ON et.tag_id = t.id
GROUP BY m.condition_id, e.id, c.id;

-- View for tags with counters (security invoker)
CREATE OR REPLACE VIEW v_tags_with_counts WITH (security_invoker = TRUE) AS
SELECT
  t.*,
  COALESCE(parent.name, '') AS parent_tag_name,
  (
    SELECT count(*)
    FROM tags child
    WHERE child.parent_tag_id = t.id
  ) AS child_tags_count
FROM tags t
LEFT JOIN tags parent ON t.parent_tag_id = parent.id;

-- View for user positions with market context
CREATE OR REPLACE VIEW v_user_positions_full WITH (security_invoker = TRUE) AS
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
FROM user_position_balances upb
JOIN conditions c ON upb.condition_id = c.id
LEFT JOIN markets m ON c.id = m.condition_id
LEFT JOIN events e ON m.event_id = e.id
LEFT JOIN outcomes o ON c.id = o.condition_id AND upb.outcome_index = o.outcome_index
WHERE upb.balance > 0;

-- View for comments with user info and like status (optimized for loading)
CREATE OR REPLACE VIEW v_comments_with_user WITH (security_invoker = TRUE) AS
SELECT
  c.id,
  c.event_id,
  c.user_id,
  c.parent_comment_id,
  c.content,
  c.is_edited,
  c.is_deleted,
  c.likes_count,
  c.replies_count,
  c.created_at,
  c.updated_at,
  -- User info
  u.username,
  u.image as user_avatar,
  u.address as user_address,
  -- Aggregated reply info for root comments
  CASE
    WHEN c.parent_comment_id IS NULL THEN (
      SELECT json_agg(
               json_build_object(
                 'id', r.id,
                 'content', r.content,
                 'user_id', r.user_id,
                 'username', r.username,
                 'user_avatar', r.user_avatar,
                 'user_address', r.user_address,
                 'likes_count', r.likes_count,
                 'is_edited', r.is_edited,
                 'created_at', r.created_at
               ) ORDER BY r.created_at
             )
      FROM (
             SELECT
               r.id,
               r.content,
               r.user_id,
               ru.username,
               ru.image AS user_avatar,
               ru.address AS user_address,
               r.likes_count,
               r.is_edited,
               r.created_at
             FROM comments r
                    JOIN users ru ON r.user_id = ru.id
             WHERE r.parent_comment_id = c.id
               AND r.is_deleted = FALSE
             ORDER BY r.created_at
             LIMIT 3
           ) r
    ) END as recent_replies
FROM
  comments c
  JOIN users u ON c.user_id = u.id
WHERE
  c.is_deleted = FALSE;

-- ============================================================
-- 🔍 VALIDATION QUERIES
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
  name,
  public
FROM
  storage.buckets
WHERE
  id = 'forkast-assets';

-- Verify all tables have RLS enabled
SELECT 
    t.schemaname,
    t.tablename,
    t.rowsecurity as rls_enabled,
    CASE 
        WHEN t.rowsecurity THEN 'RLS Enabled ✅'
        ELSE 'RLS Missing ❌'
    END as status
FROM pg_tables t
WHERE t.schemaname = 'public' 
ORDER BY t.tablename;

-- Verify policies exist for each table
SELECT 
    t.schemaname,
    t.tablename,
    COUNT(pol.*) as policy_count,
    CASE 
        WHEN COUNT(pol.*) > 0 THEN 'Has Policies ✅'
        ELSE 'No Policies ❌'
    END as policy_status
FROM pg_tables t
LEFT JOIN pg_policies pol ON t.tablename = pol.tablename AND t.schemaname = pol.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename
ORDER BY t.tablename;

-- List all RLS policies for review
SELECT 
    pol.schemaname,
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
