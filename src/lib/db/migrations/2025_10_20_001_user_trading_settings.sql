-- ===========================================
-- Ensure trading settings defaults on users.settings
-- ===========================================

-- Create trading settings object for users missing it
UPDATE users
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{trading}',
  jsonb_build_object('market_order_type', 'fak'),
  true
)
WHERE settings->'trading' IS NULL;

-- Ensure market_order_type exists with default FAK
UPDATE users
SET settings = jsonb_set(
  settings,
  '{trading,market_order_type}',
  to_jsonb('fak'::text),
  true
)
WHERE settings #>> '{trading,market_order_type}' IS NULL;

-- Set default for new users
ALTER TABLE users
  ALTER COLUMN settings
  SET DEFAULT jsonb_build_object(
    'trading',
    jsonb_build_object('market_order_type', 'fak')
  );
