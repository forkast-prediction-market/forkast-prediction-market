-- ===========================================
-- 1. TABLES
-- ===========================================

-- Comments table - Main discussion system
CREATE TABLE comments
(
  id                CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  event_id          CHAR(26)    NOT NULL REFERENCES events (id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           CHAR(26)    NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  parent_comment_id CHAR(26) REFERENCES comments (id) ON DELETE CASCADE ON UPDATE CASCADE,
  content           TEXT        NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000),
  is_deleted        BOOLEAN              DEFAULT FALSE,
  likes_count       INTEGER              DEFAULT 0 CHECK (likes_count >= 0),
  replies_count     INTEGER              DEFAULT 0 CHECK (replies_count >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment likes/reactions
CREATE TABLE comment_likes
(
  comment_id CHAR(26) NOT NULL REFERENCES comments (id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id    CHAR(26) NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (comment_id, user_id)
);

-- Comment reports (for moderation) (depends on comments + users)
CREATE TABLE comment_reports
(
  id               CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  comment_id       CHAR(26)    NOT NULL REFERENCES comments (id) ON DELETE CASCADE ON UPDATE CASCADE,
  reporter_user_id CHAR(26)    NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  reason           TEXT        NOT NULL CHECK (reason IN ('spam', 'abuse', 'inappropriate', 'other')),
  description      TEXT,
  status           TEXT                 DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, reporter_user_id)
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

-- ===========================================
-- 3. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE comments
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports
  ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. POLICIES
-- ===========================================

CREATE POLICY "service_role_all_comments" ON "comments" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_comment_likes" ON "comment_likes" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_comment_reports" ON "comment_reports" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);

-- ===========================================
-- 5. FUNCTIONS
-- ===========================================

-- Function to update comment likes counter
CREATE OR REPLACE FUNCTION update_comment_likes_count()
  RETURNS TRIGGER
  SET search_path = 'public'
AS
$$
BEGIN
  -- Update likes count for the comment
  IF TG_OP = 'INSERT' THEN
    UPDATE comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.comment_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- Function to update comment replies counter
CREATE OR REPLACE FUNCTION update_comment_replies_count()
  RETURNS TRIGGER
  SET search_path = 'public'
AS
$$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE comments
    SET replies_count = replies_count + 1
    WHERE id = NEW.parent_comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE comments
    SET replies_count = GREATEST(replies_count - 1, 0)
    WHERE id = OLD.parent_comment_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.parent_comment_id IS DISTINCT FROM NEW.parent_comment_id THEN
    -- Handle parent change (rare case)
    IF OLD.parent_comment_id IS NOT NULL THEN
      UPDATE comments
      SET replies_count = GREATEST(replies_count - 1, 0)
      WHERE id = OLD.parent_comment_id;
    END IF;
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE comments
      SET replies_count = replies_count + 1
      WHERE id = NEW.parent_comment_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- ===========================================
-- 6. TRIGGERS
-- ===========================================

CREATE TRIGGER set_comments_updated_at
  BEFORE UPDATE
  ON comments
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_comment_likes_count
  AFTER INSERT OR DELETE
  ON comment_likes
  FOR EACH ROW
EXECUTE FUNCTION update_comment_likes_count();

CREATE TRIGGER trigger_update_comment_replies_count
  AFTER INSERT OR UPDATE OR DELETE
  ON comments
  FOR EACH ROW
EXECUTE FUNCTION update_comment_replies_count();

-- ===========================================
-- 7. VIEWS
-- ===========================================

CREATE OR REPLACE VIEW v_comments_with_user
    WITH
    (security_invoker = TRUE)
AS
SELECT c.id,
       c.event_id,
       c.user_id,
       c.parent_comment_id,
       c.content,
       c.is_deleted,
       c.likes_count,
       COALESCE((SELECT COUNT(*)::int
                 FROM comments r
                 WHERE r.parent_comment_id = c.id
                   AND r.is_deleted = FALSE), 0) AS replies_count,
       c.created_at,
       c.updated_at,
       -- User info
       u.username,
       u.image                                   AS user_avatar,
       u.address                                 AS user_address,
       -- Aggregated reply info for root comments
       CASE
         WHEN c.parent_comment_id IS NULL THEN (SELECT JSON_AGG(
                                                         JSON_BUILD_OBJECT('id', r.id, 'content', r.content, 'user_id',
                                                                           r.user_id, 'username', r.username,
                                                                           'user_avatar', r.user_avatar, 'user_address',
                                                                           r.user_address, 'likes_count', r.likes_count,
                                                                           'created_at', r.created_at)
                                                         ORDER BY
                                                           r.created_at
                                                       )
                                                FROM (SELECT r.id,
                                                             r.content,
                                                             r.user_id,
                                                             ru.username,
                                                             ru.image   AS user_avatar,
                                                             ru.address AS user_address,
                                                             r.likes_count,
                                                             r.created_at
                                                      FROM comments r
                                                             JOIN users ru ON r.user_id = ru.id
                                                      WHERE r.parent_comment_id = c.id
                                                        AND r.is_deleted = FALSE
                                                      ORDER BY r.created_at
                                                      LIMIT 3) r)
         END                                     AS recent_replies
FROM comments c
       JOIN users u ON c.user_id = u.id
WHERE c.is_deleted = FALSE;

