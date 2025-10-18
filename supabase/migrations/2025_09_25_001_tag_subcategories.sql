BEGIN;

-- ============================================================
-- TAG SUBCATEGORIES VIEW - Enhanced Tag Relationships
-- ============================================================
-- Views: v_main_tag_subcategories
-- Dependencies: tags, event_tags, markets (from events migration)
-- Business Logic: Dynamic subcategory counts per main category with market activity
-- ============================================================

-- View to expose dynamic subcategory counts per main category
CREATE OR REPLACE VIEW public.v_main_tag_subcategories AS
SELECT main_tag.id                    AS main_tag_id,
       main_tag.slug                  AS main_tag_slug,
       main_tag.name                  AS main_tag_name,
       sub_tag.id                     AS sub_tag_id,
       sub_tag.name                   AS sub_tag_name,
       sub_tag.slug                   AS sub_tag_slug,
       sub_tag.is_main_category       AS sub_tag_is_main_category,
       COUNT(DISTINCT m.condition_id) AS active_markets_count,
       MAX(m.updated_at)              AS last_market_activity_at,
       main_tag.is_hidden             AS main_tag_is_hidden,
       sub_tag.is_hidden              AS sub_tag_is_hidden
FROM public.tags AS main_tag
       JOIN public.event_tags AS et_main
            ON et_main.tag_id = main_tag.id
       JOIN public.markets AS m
            ON m.event_id = et_main.event_id
       JOIN public.event_tags AS et_sub
            ON et_sub.event_id = et_main.event_id
       JOIN public.tags AS sub_tag
            ON sub_tag.id = et_sub.tag_id
WHERE main_tag.is_main_category = TRUE
  AND main_tag.is_hidden = FALSE
  AND m.is_active = TRUE
  AND m.is_resolved = FALSE
  AND sub_tag.id <> main_tag.id
  AND sub_tag.is_main_category = FALSE
  AND sub_tag.is_hidden = FALSE
GROUP BY main_tag.id,
         main_tag.slug,
         main_tag.name,
         sub_tag.id,
         sub_tag.name,
         sub_tag.slug,
         sub_tag.is_main_category,
         main_tag.is_hidden,
         sub_tag.is_hidden;

ALTER VIEW public.v_main_tag_subcategories
  SET (security_invoker = true);

COMMIT;
