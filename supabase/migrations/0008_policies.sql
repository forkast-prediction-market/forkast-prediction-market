-- ============================================================
-- 0008_policies.sql - Row Level Security Policies
-- ============================================================
-- Create comprehensive RLS policies

-- Public read policies for anonymous users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Markets are public' AND tablename = 'markets') THEN
        CREATE POLICY "Markets are public" ON markets FOR SELECT TO anon USING (is_active = TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Events are public' AND tablename = 'events') THEN
        CREATE POLICY "Events are public" ON events FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tags are public' AND tablename = 'tags') THEN
        CREATE POLICY "Tags are public" ON tags FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Event tags are public' AND tablename = 'event_tags') THEN
        CREATE POLICY "Event tags are public" ON event_tags FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Outcomes are public' AND tablename = 'outcomes') THEN
        CREATE POLICY "Outcomes are public" ON outcomes FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Conditions are public' AND tablename = 'conditions') THEN
        CREATE POLICY "Conditions are public" ON conditions FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Order fills are public' AND tablename = 'order_fills') THEN
        CREATE POLICY "Order fills are public" ON order_fills FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

-- Additional public read policies for blockchain data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Orders matched global are public' AND tablename = 'orders_matched_global') THEN
        CREATE POLICY "Orders matched global are public" ON orders_matched_global FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Market open interest is public' AND tablename = 'market_open_interest') THEN
        CREATE POLICY "Market open interest is public" ON market_open_interest FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Global open interest is public' AND tablename = 'global_open_interest') THEN
        CREATE POLICY "Global open interest is public" ON global_open_interest FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Position splits are public' AND tablename = 'position_splits') THEN
        CREATE POLICY "Position splits are public" ON position_splits FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Position merges are public' AND tablename = 'position_merges') THEN
        CREATE POLICY "Position merges are public" ON position_merges FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Redemptions are public' AND tablename = 'redemptions') THEN
        CREATE POLICY "Redemptions are public" ON redemptions FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Market resolutions are public' AND tablename = 'market_resolutions') THEN
        CREATE POLICY "Market resolutions are public" ON market_resolutions FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sports games are public' AND tablename = 'sports_games') THEN
        CREATE POLICY "Sports games are public" ON sports_games FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sports markets are public' AND tablename = 'sports_markets') THEN
        CREATE POLICY "Sports markets are public" ON sports_markets FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'FPMMs are public' AND tablename = 'fpmms') THEN
        CREATE POLICY "FPMMs are public" ON fpmms FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Collaterals are public' AND tablename = 'collaterals') THEN
        CREATE POLICY "Collaterals are public" ON collaterals FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'FPMM pool memberships are public' AND tablename = 'fpmm_pool_memberships') THEN
        CREATE POLICY "FPMM pool memberships are public" ON fpmm_pool_memberships FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Global USDC balance is public' AND tablename = 'global_usdc_balance') THEN
        CREATE POLICY "Global USDC balance is public" ON global_usdc_balance FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

-- User authentication table policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can view own profile" ON users FOR SELECT TO authenticated USING (auth.uid()::text = id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text);
    END IF;
END $$;

-- Sessions policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own sessions' AND tablename = 'sessions') THEN
        CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own sessions' AND tablename = 'sessions') THEN
        CREATE POLICY "Users can delete own sessions" ON sessions FOR DELETE TO authenticated USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

-- Accounts policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own accounts' AND tablename = 'accounts') THEN
        CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own accounts' AND tablename = 'accounts') THEN
        CREATE POLICY "Users can manage own accounts" ON accounts FOR ALL TO authenticated USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);
    END IF;
END $$;

-- Verifications policies (only service role)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role can manage verifications' AND tablename = 'verifications') THEN
        CREATE POLICY "Service role can manage verifications" ON verifications FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
END $$;

-- Bookmarks policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own bookmarks' AND tablename = 'bookmarks') THEN
        CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own bookmarks' AND tablename = 'bookmarks') THEN
        CREATE POLICY "Users can manage own bookmarks" ON bookmarks FOR ALL TO authenticated USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);
    END IF;
END $$;

-- Wallets policies (users can only see their own)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own wallets' AND tablename = 'wallets') THEN
        CREATE POLICY "Users can view own wallets" ON wallets FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own wallets' AND tablename = 'wallets') THEN
        CREATE POLICY "Users can manage own wallets" ON wallets FOR ALL TO authenticated USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);
    END IF;
END $$;

-- User position balances - users can only see their own
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see own positions' AND tablename = 'user_position_balances') THEN
        CREATE POLICY "Users can see own positions" ON user_position_balances FOR SELECT TO authenticated USING (user_address = auth.jwt() ->> 'wallet_address');
    END IF;
END $$;

-- Sync status - read access for authenticated, full access for service role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read sync status' AND tablename = 'sync_status') THEN
        CREATE POLICY "Authenticated users can read sync status" ON sync_status FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

-- Additional authenticated user policies (for read access to all data)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read markets' AND tablename = 'markets') THEN
        CREATE POLICY "Authenticated users can read markets" ON markets FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read events' AND tablename = 'events') THEN
        CREATE POLICY "Authenticated users can read events" ON events FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read tags' AND tablename = 'tags') THEN
        CREATE POLICY "Authenticated users can read tags" ON tags FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read event_tags' AND tablename = 'event_tags') THEN
        CREATE POLICY "Authenticated users can read event_tags" ON event_tags FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read outcomes' AND tablename = 'outcomes') THEN
        CREATE POLICY "Authenticated users can read outcomes" ON outcomes FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read conditions' AND tablename = 'conditions') THEN
        CREATE POLICY "Authenticated users can read conditions" ON conditions FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read order_fills' AND tablename = 'order_fills') THEN
        CREATE POLICY "Authenticated users can read order_fills" ON order_fills FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

-- Additional authenticated policies for blockchain data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read orders_matched_global' AND tablename = 'orders_matched_global') THEN
        CREATE POLICY "Authenticated users can read orders_matched_global" ON orders_matched_global FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read market_open_interest' AND tablename = 'market_open_interest') THEN
        CREATE POLICY "Authenticated users can read market_open_interest" ON market_open_interest FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read global_open_interest' AND tablename = 'global_open_interest') THEN
        CREATE POLICY "Authenticated users can read global_open_interest" ON global_open_interest FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read position_splits' AND tablename = 'position_splits') THEN
        CREATE POLICY "Authenticated users can read position_splits" ON position_splits FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read position_merges' AND tablename = 'position_merges') THEN
        CREATE POLICY "Authenticated users can read position_merges" ON position_merges FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read redemptions' AND tablename = 'redemptions') THEN
        CREATE POLICY "Authenticated users can read redemptions" ON redemptions FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read market_resolutions' AND tablename = 'market_resolutions') THEN
        CREATE POLICY "Authenticated users can read market_resolutions" ON market_resolutions FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read sports_games' AND tablename = 'sports_games') THEN
        CREATE POLICY "Authenticated users can read sports_games" ON sports_games FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read sports_markets' AND tablename = 'sports_markets') THEN
        CREATE POLICY "Authenticated users can read sports_markets" ON sports_markets FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read fpmms' AND tablename = 'fpmms') THEN
        CREATE POLICY "Authenticated users can read fpmms" ON fpmms FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read collaterals' AND tablename = 'collaterals') THEN
        CREATE POLICY "Authenticated users can read collaterals" ON collaterals FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read fpmm_pool_memberships' AND tablename = 'fpmm_pool_memberships') THEN
        CREATE POLICY "Authenticated users can read fpmm_pool_memberships" ON fpmm_pool_memberships FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read global_usdc_balance' AND tablename = 'global_usdc_balance') THEN
        CREATE POLICY "Authenticated users can read global_usdc_balance" ON global_usdc_balance FOR SELECT TO authenticated USING (TRUE);
    END IF;
END $$;

-- ============================================================
-- 💬 COMMENTS SYSTEM POLICIES
-- ============================================================
-- Comment policies - public read, authenticated write
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Comments are public' AND tablename = 'comments') THEN
        CREATE POLICY "Comments are public" ON comments FOR SELECT TO anon USING (is_deleted = FALSE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create comments' AND tablename = 'comments') THEN
        CREATE POLICY "Users can create comments" ON comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::INTEGER);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can edit own comments' AND tablename = 'comments') THEN
        CREATE POLICY "Users can edit own comments" ON comments FOR UPDATE TO authenticated USING (user_id = auth.uid()::INTEGER) WITH CHECK (user_id = auth.uid()::INTEGER);
    END IF;
END $$;

-- Comment likes - authenticated users only
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Comment likes are public' AND tablename = 'comment_likes') THEN
        CREATE POLICY "Comment likes are public" ON comment_likes FOR SELECT TO anon USING (TRUE);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can like comments' AND tablename = 'comment_likes') THEN
        CREATE POLICY "Users can like comments" ON comment_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::INTEGER);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can unlike comments' AND tablename = 'comment_likes') THEN
        CREATE POLICY "Users can unlike comments" ON comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid()::INTEGER);
    END IF;
END $$;

-- Comment reports - private to reporter and admins
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own reports' AND tablename = 'comment_reports') THEN
        CREATE POLICY "Users can view own reports" ON comment_reports FOR SELECT TO authenticated USING (reporter_user_id = auth.uid()::INTEGER);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create reports' AND tablename = 'comment_reports') THEN
        CREATE POLICY "Users can create reports" ON comment_reports FOR INSERT TO authenticated WITH CHECK (reporter_user_id = auth.uid()::INTEGER);
    END IF;
END $$;
