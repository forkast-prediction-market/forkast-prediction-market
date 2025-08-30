-- ============================================================
-- COMMENTS SYSTEM - Complete Domain Implementation
-- ============================================================
-- Tables: comments, comment_likes, comment_reports
-- Dependencies: users (comments.user_id), events (comments.event_id)
-- Business Logic: Like counting, reply threading, moderation
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

-- Comments table - Main discussion system (depends on users + events)
CREATE TABLE IF NOT EXISTS comments
(
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id          INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id           INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  parent_comment_id INTEGER REFERENCES comments (id) ON DELETE CASCADE,
  content           TEXT    NOT NULL CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 2000),
  is_edited         BOOLEAN     DEFAULT FALSE,
  is_deleted        BOOLEAN     DEFAULT FALSE,
  likes_count       INTEGER     DEFAULT 0 CHECK (likes_count >= 0),
  replies_count     INTEGER     DEFAULT 0 CHECK (replies_count >= 0),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Comment likes/reactions table (depends on comments + users)
CREATE TABLE IF NOT EXISTS comment_likes
(
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments (id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

-- Comment reports (for moderation) (depends on comments + users)
CREATE TABLE IF NOT EXISTS comment_reports
(
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  comment_id       INTEGER     NOT NULL REFERENCES comments (id) ON DELETE CASCADE,
  reporter_user_id INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason           VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'abuse', 'inappropriate', 'other')),
  description      TEXT,
  status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by      INTEGER REFERENCES users (id),
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (comment_id, reporter_user_id)
);

-- ===========================================
-- 2. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all comment-related tables
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 3. SECURITY POLICIES
-- ===========================================

-- Comments policies
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_comments' AND tablename = 'comments') THEN
      CREATE POLICY "service_role_all_comments" ON comments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Comment likes policies
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_comment_likes' AND tablename = 'comment_likes') THEN
      CREATE POLICY "service_role_all_comment_likes" ON comment_likes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- Comment reports policies
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_comment_reports' AND tablename = 'comment_reports') THEN
      CREATE POLICY "service_role_all_comment_reports" ON comment_reports FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- ===========================================
-- 4. BUSINESS LOGIC FUNCTIONS
-- ===========================================

-- Function for automatic updated_at (shared across domains)
CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER
  SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Function to update comment likes counter
CREATE OR REPLACE FUNCTION update_comment_likes_count()
  RETURNS TRIGGER
  SET search_path = 'public'
AS $$
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
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_comment_id IS NOT NULL THEN
    UPDATE comments
    SET replies_count = replies_count + 1
    WHERE id = NEW.parent_comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_comment_id IS NOT NULL THEN
    UPDATE comments
    SET replies_count = GREATEST(replies_count - 1, 0)
    WHERE id = OLD.parent_comment_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.parent_comment_id != NEW.parent_comment_id THEN
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
-- 5. TRIGGERS
-- ===========================================

-- Updated_at trigger for comments
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_comments_updated_at') THEN
      CREATE TRIGGER update_comments_updated_at
        BEFORE UPDATE
        ON comments
        FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;

-- Business logic triggers for comment counters
DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_comment_likes_count') THEN
      CREATE TRIGGER trigger_update_comment_likes_count
        AFTER INSERT OR DELETE
        ON comment_likes
        FOR EACH ROW
      EXECUTE FUNCTION update_comment_likes_count();
    END IF;
  END
$$;

DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_comment_replies_count') THEN
      CREATE TRIGGER trigger_update_comment_replies_count
        AFTER INSERT OR UPDATE OR DELETE
        ON comments
        FOR EACH ROW
      EXECUTE FUNCTION update_comment_replies_count();
    END IF;
  END
$$;

-- ===========================================
-- 6. GRANTS
-- ===========================================

-- All comment tables covered by broad grants
-- No additional explicit grants needed

-- ============================================================
-- END OF COMMENTS SYSTEM MIGRATION
-- This completes your domain-based migration reorganization!
-- ============================================================
