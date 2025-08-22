-- 004.do.sql - Database Views and Row Level Security
-- Views and RLS policies from the original schema

-- ============================================================
-- 🔍 USEFUL VIEWS FOR QUERIES
-- ============================================================

-- View for markets with complete information (security invoker)
CREATE OR REPLACE VIEW v_markets_full 
WITH (security_invoker = true) AS
SELECT 
    m.condition_id,
    m.name as market_name,
    m.slug as market_slug,
    m.outcome_count,
    m.is_active,
    m.is_resolved,
    m.icon_url as market_icon_url,
    m.block_number,
    m.block_timestamp,
    m.current_volume_24h,
    m.total_volume,
    m.open_interest,
    
    e.id as event_id,
    e.title as event_title,
    e.slug as event_slug,
    e.icon_url as event_icon_url,
    
    c.oracle,
    c.question_id,
    c.outcome_slot_count,
    c.resolved,
    c.payout_numerators,
    c.payout_denominator,
    c.arweave_hash,
    c.creator,
    
    array_agg(DISTINCT t.name) as tags,
    array_agg(DISTINCT t.slug) as tag_slugs,
    
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
            ) ORDER BY o.outcome_index
        )
        FROM outcomes o 
        WHERE o.condition_id = m.condition_id
    ) as outcomes
    
FROM markets m
JOIN events e ON m.event_id = e.id
JOIN conditions c ON m.condition_id = c.id
LEFT JOIN event_tags et ON e.id = et.event_id
LEFT JOIN tags t ON et.tag_id = t.id
GROUP BY m.condition_id, e.id, c.id;

-- View for tags with counters (security invoker)
CREATE OR REPLACE VIEW v_tags_with_counts 
WITH (security_invoker = true) AS
SELECT 
    t.*,
    COALESCE(parent.name, '') as parent_tag_name,
    (
        SELECT COUNT(*)
        FROM tags child
        WHERE child.parent_tag_id = t.id
    ) as child_tags_count
FROM tags t
LEFT JOIN tags parent ON t.parent_tag_id = parent.id;

-- View for user positions with market context
CREATE OR REPLACE VIEW v_user_positions_full
WITH (security_invoker = true) AS
SELECT 
    upb.*,
    c.oracle,
    c.question_id,
    c.resolved,
    m.name as market_name,
    m.slug as market_slug,
    e.title as event_title,
    o.outcome_text,
    o.current_price
FROM user_position_balances upb
JOIN conditions c ON upb.condition_id = c.id
LEFT JOIN markets m ON c.id = m.condition_id
LEFT JOIN events e ON m.event_id = e.id
LEFT JOIN outcomes o ON c.id = o.condition_id AND upb.outcome_index = o.outcome_index
WHERE upb.balance > 0;

-- ============================================================
-- 🛡️ ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all public tables
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_position_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_fills ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_matched_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_open_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_open_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fpmms ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaterals ENABLE ROW LEVEL SECURITY;
ALTER TABLE fpmm_pool_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_usdc_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Public read policies for anonymous users
CREATE POLICY "Markets are public" ON markets FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Events are public" ON events FOR SELECT TO anon USING (true);
CREATE POLICY "Tags are public" ON tags FOR SELECT TO anon USING (true);
CREATE POLICY "Event tags are public" ON event_tags FOR SELECT TO anon USING (true);
CREATE POLICY "Outcomes are public" ON outcomes FOR SELECT TO anon USING (true);
CREATE POLICY "Conditions are public" ON conditions FOR SELECT TO anon USING (true);
CREATE POLICY "Order fills are public" ON order_fills FOR SELECT TO anon USING (true);

-- Additional public read policies for blockchain data
CREATE POLICY "Orders matched global are public" ON orders_matched_global FOR SELECT TO anon USING (true);
CREATE POLICY "Market open interest is public" ON market_open_interest FOR SELECT TO anon USING (true);
CREATE POLICY "Global open interest is public" ON global_open_interest FOR SELECT TO anon USING (true);
CREATE POLICY "Position splits are public" ON position_splits FOR SELECT TO anon USING (true);
CREATE POLICY "Position merges are public" ON position_merges FOR SELECT TO anon USING (true);
CREATE POLICY "Redemptions are public" ON redemptions FOR SELECT TO anon USING (true);
CREATE POLICY "Market resolutions are public" ON market_resolutions FOR SELECT TO anon USING (true);
CREATE POLICY "Sports games are public" ON sports_games FOR SELECT TO anon USING (true);
CREATE POLICY "Sports markets are public" ON sports_markets FOR SELECT TO anon USING (true);
CREATE POLICY "FPMMs are public" ON fpmms FOR SELECT TO anon USING (true);
CREATE POLICY "Collaterals are public" ON collaterals FOR SELECT TO anon USING (true);
CREATE POLICY "FPMM pool memberships are public" ON fpmm_pool_memberships FOR SELECT TO anon USING (true);
CREATE POLICY "Global USDC balance is public" ON global_usdc_balance FOR SELECT TO anon USING (true);
CREATE POLICY "Wallets are public" ON wallets FOR SELECT TO anon USING (true);

-- User position balances - users can only see their own
CREATE POLICY "Users can see own positions" ON user_position_balances 
  FOR SELECT TO authenticated USING (user_address = auth.jwt() ->> 'wallet_address');

-- Sync status - only for authenticated service role
CREATE POLICY "Sync status for service role" ON sync_status 
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service role policies (full access for sync operations)
CREATE POLICY "service_role_all_sync_status" ON sync_status FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_conditions" ON conditions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_markets" ON markets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_events" ON events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_tags" ON tags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_event_tags" ON event_tags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_outcomes" ON outcomes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_user_positions" ON user_position_balances FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_order_fills" ON order_fills FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service role policies for additional tables
CREATE POLICY "service_role_all_orders_matched_global" ON orders_matched_global FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_market_open_interest" ON market_open_interest FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_global_open_interest" ON global_open_interest FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_position_splits" ON position_splits FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_position_merges" ON position_merges FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_redemptions" ON redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_market_resolutions" ON market_resolutions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_sports_games" ON sports_games FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_sports_markets" ON sports_markets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_fpmms" ON fpmms FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_collaterals" ON collaterals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_fpmm_pool_memberships" ON fpmm_pool_memberships FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_global_usdc_balance" ON global_usdc_balance FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_wallets" ON wallets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admin policies for authenticated users (if needed)
CREATE POLICY "Markets admin access" ON markets 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Events admin access" ON events 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Tags admin access" ON tags 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Event tags admin access" ON event_tags 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Outcomes admin access" ON outcomes 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Conditions admin access" ON conditions 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "User positions admin access" ON user_position_balances 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Order fills admin access" ON order_fills 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
