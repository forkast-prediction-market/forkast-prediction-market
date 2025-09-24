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
  id           CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  user_id      CHAR(26) NOT NULL REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  wallet_id    CHAR(26) REFERENCES wallets (id) ON DELETE SET NULL ON UPDATE CASCADE,
  category     TEXT     NOT NULL CHECK (category IN ('trade', 'system', 'general')),
  title        TEXT     NOT NULL,
  description  TEXT     NOT NULL,
  extra_info   TEXT,
  metadata     JSONB    NOT NULL     DEFAULT '{}'::JSONB,
  link_type    TEXT     NOT NULL     DEFAULT 'none'
    CHECK (link_type IN ('none', 'market', 'event', 'order', 'settings', 'profile', 'external', 'custom')),
  link_target  TEXT,
  link_url     TEXT,
  link_label   TEXT,
  is_read      BOOLEAN  NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ          DEFAULT NOW(),
  updated_at   TIMESTAMPTZ          DEFAULT NOW(),

  CHECK (link_url IS NULL OR char_length(link_url) <= 2048),
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
CREATE INDEX IF NOT EXISTS idx_notifications_wallet_id ON notifications (wallet_id);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications (category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE is_read = FALSE;

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

-- ===========================================
-- 4. BUSINESS LOGIC
-- ===========================================

CREATE OR REPLACE FUNCTION set_notification_read_at()
  RETURNS TRIGGER
  SET search_path = 'public'
AS
$$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_read THEN
      NEW.read_at := COALESCE(NEW.read_at, NOW());
    ELSE
      NEW.read_at := NULL;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_read AND (OLD.read_at IS NULL OR NEW.read_at IS NULL) THEN
      NEW.read_at := COALESCE(NEW.read_at, NOW());
    ELSIF NOT NEW.is_read THEN
      NEW.read_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_notifications_read_at') THEN
      CREATE TRIGGER set_notifications_read_at
        BEFORE INSERT OR UPDATE
        ON notifications
        FOR EACH ROW
      EXECUTE FUNCTION set_notification_read_at();
    END IF;
  END
$$;

DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notifications_updated_at') THEN
      CREATE TRIGGER update_notifications_updated_at
        BEFORE UPDATE
        ON notifications
        FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;
