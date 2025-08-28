-- ============================================================
-- 0008_policies.sql - Row Level Security Policies
-- ============================================================
-- Simplified RLS policies for Better Auth compatibility
-- Only service_role policies needed for sync operations

-- ============================================================
-- 🔐 SERVICE ROLE POLICIES (CRITICAL FOR SYNC OPERATIONS)
-- ============================================================
-- Service role policies for sync operations and backend access
-- These are ESSENTIAL for sync-events and other backend operations

-- Core application tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_sync_status' AND tablename = 'sync_status') THEN
        CREATE POLICY "service_role_all_sync_status" ON sync_status FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_conditions' AND tablename = 'conditions') THEN
        CREATE POLICY "service_role_all_conditions" ON conditions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_markets' AND tablename = 'markets') THEN
        CREATE POLICY "service_role_all_markets" ON markets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_events' AND tablename = 'events') THEN
        CREATE POLICY "service_role_all_events" ON events FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_tags' AND tablename = 'tags') THEN
        CREATE POLICY "service_role_all_tags" ON tags FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_event_tags' AND tablename = 'event_tags') THEN
        CREATE POLICY "service_role_all_event_tags" ON event_tags FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_outcomes' AND tablename = 'outcomes') THEN
        CREATE POLICY "service_role_all_outcomes" ON outcomes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

-- Blockchain tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_user_positions' AND tablename = 'user_position_balances') THEN
        CREATE POLICY "service_role_all_user_positions" ON user_position_balances FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_order_fills' AND tablename = 'order_fills') THEN
        CREATE POLICY "service_role_all_order_fills" ON order_fills FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_orders_matched_global' AND tablename = 'orders_matched_global') THEN
        CREATE POLICY "service_role_all_orders_matched_global" ON orders_matched_global FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_market_open_interest' AND tablename = 'market_open_interest') THEN
        CREATE POLICY "service_role_all_market_open_interest" ON market_open_interest FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_global_open_interest' AND tablename = 'global_open_interest') THEN
        CREATE POLICY "service_role_all_global_open_interest" ON global_open_interest FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_position_splits' AND tablename = 'position_splits') THEN
        CREATE POLICY "service_role_all_position_splits" ON position_splits FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_position_merges' AND tablename = 'position_merges') THEN
        CREATE POLICY "service_role_all_position_merges" ON position_merges FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_redemptions' AND tablename = 'redemptions') THEN
        CREATE POLICY "service_role_all_redemptions" ON redemptions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_market_resolutions' AND tablename = 'market_resolutions') THEN
        CREATE POLICY "service_role_all_market_resolutions" ON market_resolutions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_sports_games' AND tablename = 'sports_games') THEN
        CREATE POLICY "service_role_all_sports_games" ON sports_games FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_sports_markets' AND tablename = 'sports_markets') THEN
        CREATE POLICY "service_role_all_sports_markets" ON sports_markets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_fpmms' AND tablename = 'fpmms') THEN
        CREATE POLICY "service_role_all_fpmms" ON fpmms FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_collaterals' AND tablename = 'collaterals') THEN
        CREATE POLICY "service_role_all_collaterals" ON collaterals FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_fpmm_pool_memberships' AND tablename = 'fpmm_pool_memberships') THEN
        CREATE POLICY "service_role_all_fpmm_pool_memberships" ON fpmm_pool_memberships FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_global_usdc_balance' AND tablename = 'global_usdc_balance') THEN
        CREATE POLICY "service_role_all_global_usdc_balance" ON global_usdc_balance FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

-- Auth tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_users' AND tablename = 'users') THEN
        CREATE POLICY "service_role_all_users" ON users FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_sessions' AND tablename = 'sessions') THEN
        CREATE POLICY "service_role_all_sessions" ON sessions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_accounts' AND tablename = 'accounts') THEN
        CREATE POLICY "service_role_all_accounts" ON accounts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_verifications' AND tablename = 'verifications') THEN
        CREATE POLICY "service_role_all_verifications" ON verifications FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_wallets' AND tablename = 'wallets') THEN
        CREATE POLICY "service_role_all_wallets" ON wallets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_bookmarks' AND tablename = 'bookmarks') THEN
        CREATE POLICY "service_role_all_bookmarks" ON bookmarks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

-- Comments system
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_comments' AND tablename = 'comments') THEN
        CREATE POLICY "service_role_all_comments" ON comments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_comment_likes' AND tablename = 'comment_likes') THEN
        CREATE POLICY "service_role_all_comment_likes" ON comment_likes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_comment_reports' AND tablename = 'comment_reports') THEN
        CREATE POLICY "service_role_all_comment_reports" ON comment_reports FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

-- ============================================================
-- 📝 NOTES
-- ============================================================
-- 
-- With Better Auth integration, all user authentication and authorization
-- is handled at the application layer (Next.js API routes).
-- 
-- RLS is simplified to only service_role policies for backend operations.
-- 
-- All user-facing operations (CRUD) go through API routes that:
-- 1. Validate Better Auth sessions
-- 2. Use service_role connection for database operations
-- 3. Apply business logic and user ownership validation
-- 
-- This approach provides:
-- ✅ Full compatibility with Better Auth
-- ✅ Simplified database policies
-- ✅ Flexible authorization logic in application code
-- ✅ Better performance (fewer RLS evaluations)
-- ✅ Easier debugging and maintenance
-- 
-- Security is maintained through:
-- 🔐 Better Auth session validation
-- 🔐 API route authorization logic
-- 🔐 Service role database connection (controlled access)
-- 🔐 Business logic validation in application code
-- ============================================================