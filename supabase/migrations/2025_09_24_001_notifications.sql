BEGIN;

-- ============================================================
-- NOTIFICATIONS - User Notification System
-- ============================================================
-- Tables: notifications
-- Dependencies: users (required), wallets (optional context)
-- Business Logic: Persist user-facing notifications with flexible link targets
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

CREATE TABLE IF NOT EXISTS notifications
(
  id          CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  user_id     CHAR(26)    NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  category    TEXT        NOT NULL CHECK (category IN ('trade', 'system', 'general')),
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  extra_info  TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}'::JSONB,
  link_type   TEXT        NOT NULL DEFAULT 'none'
    CHECK (link_type IN ('none', 'market', 'event', 'order', 'settings', 'profile', 'external', 'custom')),
  link_target TEXT,
  link_url    TEXT,
  link_label  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (link_url IS NULL OR CHAR_LENGTH(link_url) <= 2048),
  CHECK (link_type <> 'external' OR link_url IS NOT NULL),
  CHECK (
    link_type NOT IN ('market', 'event', 'order', 'settings', 'profile')
      OR link_target IS NOT NULL
    )
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications (category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON notifications (user_id, created_at DESC);

-- ===========================================
-- 3. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE notifications
  ENABLE ROW LEVEL SECURITY;

DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_notifications'
                     AND tablename = 'notifications') THEN
      CREATE POLICY "service_role_all_notifications" ON notifications FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

COMMIT;
