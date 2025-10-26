-- ===========================================
-- 1. TABLES
-- ===========================================

-- Conditions table - Primary entity from Activity/PnL subgraphs
CREATE TABLE conditions
(
  id           CHAR(66) PRIMARY KEY,
  oracle       CHAR(42)    NOT NULL,
  question_id  CHAR(66)    NOT NULL,
  -- Resolution data
  resolved     BOOLEAN              DEFAULT FALSE,
  -- Metadata
  arweave_hash TEXT,     -- Arweave metadata hash
  creator      CHAR(42), -- Market creator address
  -- Timestamps
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags table - Hierarchical categorization system for events
CREATE TABLE tags
(
  id                   SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                 TEXT        NOT NULL UNIQUE,
  slug                 TEXT        NOT NULL UNIQUE,
  is_main_category     BOOLEAN              DEFAULT FALSE,
  is_hidden            BOOLEAN     NOT NULL DEFAULT FALSE,
  hide_events          BOOLEAN     NOT NULL DEFAULT FALSE,
  display_order        SMALLINT             DEFAULT 0,
  parent_tag_id        SMALLINT REFERENCES tags (id),
  active_markets_count INTEGER              DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events table - Core content structure for prediction markets
CREATE TABLE events
(
  id                   CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  slug                 TEXT        NOT NULL UNIQUE,
  title                TEXT        NOT NULL,
  creator              CHAR(42), -- Ethereum address of creator
  icon_url             TEXT,
  show_market_icons    BOOLEAN              DEFAULT TRUE,
  status               TEXT        NOT NULL DEFAULT 'active',
  rules                TEXT,     -- Event-specific rules
  active_markets_count INTEGER              DEFAULT 0,
  total_markets_count  INTEGER              DEFAULT 0,
  end_date             TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('draft', 'active', 'archived'))
);

-- Event-Tag relationship table - Many-to-many between events and tags
CREATE TABLE event_tags
(
  event_id CHAR(26) NOT NULL REFERENCES events (id) ON DELETE CASCADE ON UPDATE CASCADE,
  tag_id   SMALLINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

-- Markets table - Core trading markets (belongs to events)
CREATE TABLE markets
(
  -- IDs and Identifiers
  condition_id       TEXT PRIMARY KEY REFERENCES conditions (id) ON DELETE CASCADE ON UPDATE CASCADE,
  -- Relationships
  event_id           CHAR(26)    NOT NULL REFERENCES events (id) ON DELETE CASCADE ON UPDATE CASCADE,
  -- Market Information
  title              TEXT        NOT NULL,
  slug               TEXT        NOT NULL,
  short_title        TEXT,
  -- Images
  icon_url           TEXT,  -- markets/icons/market-slug.jpg
  -- Status and Data
  is_active          BOOLEAN              DEFAULT TRUE,
  is_resolved        BOOLEAN              DEFAULT FALSE,
  -- Metadata
  metadata           JSONB, -- Metadata from Arweave
  -- Cached Trading Metrics (from subgraphs)
  current_volume_24h DECIMAL(20, 6)       DEFAULT 0,
  total_volume       DECIMAL(20, 6)       DEFAULT 0,
  -- Timestamps
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraints
  UNIQUE (event_id, slug),
  CHECK (current_volume_24h >= 0),
  CHECK (total_volume >= 0)
);

-- Outcomes table - Individual market outcomes (belongs to markets via condition_id)
CREATE TABLE outcomes
(
  id                 CHAR(26) PRIMARY KEY DEFAULT generate_ulid(),
  condition_id       CHAR(66)    NOT NULL REFERENCES conditions (id) ON DELETE CASCADE ON UPDATE CASCADE,
  outcome_text       TEXT        NOT NULL,
  outcome_index      SMALLINT    NOT NULL,               -- 0, 1, 2... outcome order
  token_id           TEXT        NOT NULL,               -- ERC1155 token ID for this outcome
  -- Resolution data
  is_winning_outcome BOOLEAN              DEFAULT FALSE, -- When resolved
  payout_value       DECIMAL(20, 6),                     -- Final payout value
  -- Trading metrics (cached from subgraphs)
  current_price      DECIMAL(8, 4),                      -- Current market price (0.0001 to 0.9999)
  volume_24h         DECIMAL(20, 6)       DEFAULT 0,
  total_volume       DECIMAL(20, 6)       DEFAULT 0,
  -- Timestamps
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraints
  UNIQUE (condition_id, outcome_index),
  UNIQUE (token_id),
  CHECK (outcome_index >= 0),
  CHECK (current_price IS NULL OR (current_price >= 0.0001 AND current_price <= 0.9999)),
  CHECK (volume_24h >= 0),
  CHECK (total_volume >= 0),
  CHECK (payout_value IS NULL OR payout_value >= 0)
);

-- subgraph_syncs table - Blockchain synchronization tracking
CREATE TABLE subgraph_syncs
(
  id              SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_name    text        NOT NULL,                -- 'activity_sync', 'pnl_sync', etc.
  subgraph_name   text        NOT NULL,                -- 'activity', 'pnl', 'oi', etc.
  status          text                 DEFAULT 'idle', -- 'running', 'completed', 'error'
  total_processed INTEGER              DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraints
  UNIQUE (service_name, subgraph_name),
  CHECK (status IN ('idle', 'running', 'completed', 'error')),
  CHECK (total_processed >= 0)
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

CREATE INDEX events_end_date_idx ON events (end_date);

-- ===========================================
-- 3. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE conditions
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subgraph_syncs
  ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. POLICIES
-- ===========================================

CREATE POLICY "service_role_all_conditions" ON "conditions" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_tags" ON "tags" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_events" ON "events" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_event_tags" ON "event_tags" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_markets" ON "markets" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_outcomes" ON "outcomes" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_all_subgraph_syncs" ON "subgraph_syncs" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);

-- ===========================================
-- 5. FUNCTIONS
-- ===========================================

-- Function to update active markets count per event (business logic)
CREATE OR REPLACE FUNCTION update_event_markets_count()
  RETURNS TRIGGER
  SET search_path = 'public'
AS
$$
BEGIN
  -- Update affected event counter
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE events
    SET active_markets_count = (SELECT COUNT(*)
                                FROM markets
                                WHERE event_id = NEW.event_id
                                  AND is_active = TRUE
                                  AND is_resolved = FALSE),
        total_markets_count  = (SELECT COUNT(*)
                                FROM markets
                                WHERE event_id = NEW.event_id)
    WHERE id = NEW.event_id;
  END IF;

  -- If DELETE or UPDATE that changed event_id
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.event_id != NEW.event_id) THEN
    UPDATE events
    SET active_markets_count = (SELECT COUNT(*)
                                FROM markets
                                WHERE event_id = OLD.event_id
                                  AND is_active = TRUE
                                  AND is_resolved = FALSE),
        total_markets_count  = (SELECT COUNT(*)
                                FROM markets
                                WHERE event_id = OLD.event_id)
    WHERE id = OLD.event_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- Function to update markets count per tag (business logic)
CREATE OR REPLACE FUNCTION update_tag_markets_count()
  RETURNS TRIGGER
  SET search_path = 'public'
AS
$$
DECLARE
  affected_event_id CHAR(26);
BEGIN
  -- Get the event_id from NEW or OLD
  affected_event_id := COALESCE(NEW.event_id, OLD.event_id);

  -- Update only tags linked to this specific event
  UPDATE tags
  SET active_markets_count = (SELECT COUNT(DISTINCT m.condition_id)
                              FROM markets m
                                     JOIN event_tags et ON m.event_id = et.event_id
                              WHERE et.tag_id = tags.id
                                AND m.is_active = TRUE
                                AND m.is_resolved = FALSE)
  WHERE id IN (SELECT DISTINCT et.tag_id
               FROM event_tags et
               WHERE et.event_id = affected_event_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- ===========================================
-- 6. TRIGGERS
-- ===========================================

CREATE TRIGGER set_conditions_updated_at
  BEFORE UPDATE
  ON conditions
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE
  ON events
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_markets_updated_at
  BEFORE UPDATE
  ON markets
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_outcomes_updated_at
  BEFORE UPDATE
  ON outcomes
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_tags_updated_at
  BEFORE UPDATE
  ON tags
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_subgraph_syncs_updated_at
  BEFORE UPDATE
  ON subgraph_syncs
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_update_event_markets_count
  AFTER INSERT OR UPDATE OR DELETE
  ON markets
  FOR EACH ROW
EXECUTE FUNCTION update_event_markets_count();

CREATE TRIGGER trigger_update_tag_markets_count
  AFTER INSERT OR UPDATE OR DELETE
  ON markets
  FOR EACH ROW
EXECUTE FUNCTION update_tag_markets_count();

CREATE TRIGGER trigger_update_tag_markets_count_event_tags
  AFTER INSERT OR UPDATE OR DELETE
  ON event_tags
  FOR EACH ROW
EXECUTE FUNCTION update_tag_markets_count();

-- ===========================================
-- 7. VIEWS
-- ===========================================

CREATE OR REPLACE VIEW v_visible_events AS
SELECT events.*
FROM events
WHERE status = 'active'
  AND NOT EXISTS (SELECT 1
                  FROM event_tags
                         JOIN tags ON tags.id = event_tags.tag_id
                  WHERE event_tags.event_id = events.id
                    AND tags.hide_events = TRUE);

CREATE OR REPLACE VIEW v_main_tag_subcategories AS
SELECT main_tag.id                    AS main_tag_id,
       main_tag.slug                  AS main_tag_slug,
       main_tag.name                  AS main_tag_name,
       main_tag.is_hidden             AS main_tag_is_hidden,
       sub_tag.id                     AS sub_tag_id,
       sub_tag.name                   AS sub_tag_name,
       sub_tag.slug                   AS sub_tag_slug,
       sub_tag.is_main_category       AS sub_tag_is_main_category,
       sub_tag.is_hidden              AS sub_tag_is_hidden,
       COUNT(DISTINCT m.condition_id) AS active_markets_count,
       MAX(m.updated_at)              AS last_market_activity_at
FROM tags AS main_tag
       JOIN event_tags AS et_main
            ON et_main.tag_id = main_tag.id
       JOIN markets AS m
            ON m.event_id = et_main.event_id
       JOIN event_tags AS et_sub
            ON et_sub.event_id = et_main.event_id
       JOIN tags AS sub_tag
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
         main_tag.is_hidden,
         sub_tag.id,
         sub_tag.name,
         sub_tag.slug,
         sub_tag.is_main_category,
         sub_tag.is_hidden;

-- ===========================================
-- 8. SEED
-- ===========================================

-- Insert initial main tags
INSERT INTO tags (name, slug, is_main_category, display_order)
VALUES ('Politics', 'politics', TRUE, 1),
       ('Middle East', 'middle-east', TRUE, 2),
       ('Sports', 'sports', TRUE, 3),
       ('Crypto', 'crypto', TRUE, 4),
       ('Tech', 'tech', TRUE, 5),
       ('Culture', 'culture', TRUE, 6),
       ('World', 'world', TRUE, 7),
       ('Economy', 'economy', TRUE, 8),
       ('Trump', 'trump', TRUE, 9),
       ('Elections', 'elections', TRUE, 10),
       ('Mentions', 'mentions', TRUE, 11)
ON CONFLICT (slug) DO NOTHING;

-- Hide specific categories by default to keep them out of the main feed
UPDATE tags
SET hide_events = TRUE
WHERE slug IN ('crypto-prices', 'recurring', 'today-', 'today', '4h', 'daily');
