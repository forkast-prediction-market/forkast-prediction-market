BEGIN;

-- ============================================================
-- SETTINGS TABLE MIGRATION
-- ============================================================
-- Tables: settings
-- Business Logic: Flexible key-value settings system organized by groups
-- Migration: Replaces rigid fork_settings with extensible settings table
-- ============================================================

-- ===========================================
-- 1. TABLE CREATION
-- ===========================================

CREATE TABLE IF NOT EXISTS settings
(
  id         SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "group"    TEXT        NOT NULL,
  key        TEXT        NOT NULL,
  value      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("group", key)
);

-- ===========================================
-- 2. ROW LEVEL SECURITY / POLICIES
-- ===========================================

ALTER TABLE settings
  ENABLE ROW LEVEL SECURITY;

DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1
                   FROM pg_policies
                   WHERE policyname = 'service_role_all_settings'
                     AND tablename = 'settings') THEN
      CREATE POLICY "service_role_all_settings" ON settings FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
    END IF;
  END
$$;

-- ===========================================
-- 3. TRIGGERS
-- ===========================================

DO
$$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at') THEN
      CREATE TRIGGER update_settings_updated_at
        BEFORE UPDATE
        ON settings
        FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END
$$;

-- ===========================================
-- 4. SEED DATA
-- ===========================================

-- Insert default affiliate settings
INSERT INTO settings ("group", key, value)
VALUES ('affiliate', 'trade_fee_bps', '100'),       -- 1.00% trading fee
       ('affiliate', 'affiliate_share_bps', '5000') -- 50% of trading fees go to affiliates
ON CONFLICT ("group", key) DO NOTHING;

-- Insert default AI settings
INSERT INTO settings ("group", key, value)
VALUES ('ai', 'openrouter_api_key', ''),
       ('ai', 'openrouter_model', ''),
       ('ai', 'openrouter_enabled', 'false')
ON CONFLICT ("group", key) DO NOTHING;

COMMIT;
