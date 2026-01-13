-- ===========================================
-- 1. MAIN TAGS ORDER
-- ===========================================

WITH desired(name, slug, display_order) AS (
  VALUES
    ('Politics', 'politics', 1),
    ('Sports', 'sports', 2),
    ('Crypto', 'crypto', 3),
    ('Finance', 'finance', 4),
    ('Geopolitics', 'geopolitics', 5),
    ('Earnings', 'earnings', 6),
    ('Tech', 'tech', 7),
    ('Culture', 'culture', 8),
    ('World', 'world', 9),
    ('Economy', 'economy', 10),
    ('Climate & Science', 'climate-science', 11),
    ('Elections', 'elections', 12),
    ('Mentions', 'mentions', 13)
),
upserted AS (
  INSERT INTO tags (name, slug, is_main_category, display_order, is_hidden, hide_events)
  SELECT name, slug, TRUE, display_order, FALSE, FALSE
  FROM desired
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    is_main_category = TRUE,
    is_hidden = FALSE,
    hide_events = FALSE
  RETURNING slug
)
UPDATE tags
SET is_main_category = FALSE
WHERE is_main_category = TRUE
  AND slug NOT IN (SELECT slug FROM upserted);
