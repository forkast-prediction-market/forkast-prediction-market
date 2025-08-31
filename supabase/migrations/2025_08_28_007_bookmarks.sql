-- ============================================================
-- BOOKMARKS - User Engagement Domain
-- ============================================================
-- Tables: bookmarks
-- Dependencies: users (bookmarks.user_id), events (bookmarks.event_id)
-- Business Logic: User event bookmarking system
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

-- Bookmarks table - User event bookmarks (depends on users + events)
CREATE TABLE IF NOT EXISTS bookmarks
(
  user_id  CHAR(26) NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  event_id CHAR(26) NOT NULL REFERENCES events (id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (user_id, event_id)
);

-- ===========================================
-- 2. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on bookmarks table
ALTER TABLE bookmarks
  ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 3. SECURITY POLICIES
-- ===========================================

-- Bookmarks policies
DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_bookmarks'
                     AND tablename = 'bookmarks') THEN
      CREATE POLICY "service_role_all_bookmarks" ON bookmarks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;
