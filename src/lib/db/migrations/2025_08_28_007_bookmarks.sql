-- ===========================================
-- 1. TABLES
-- ===========================================

CREATE TABLE bookmarks
(
  user_id  CHAR(26) NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  event_id CHAR(26) NOT NULL REFERENCES events (id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (user_id, event_id)
);

-- ===========================================
-- 2. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE bookmarks
  ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 3. SECURITY POLICIES
-- ===========================================

CREATE POLICY "service_role_all_bookmarks" ON "bookmarks" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
