-- ===========================================
-- 1. TABLES
-- ===========================================

CREATE TABLE "orders"
(
  "id"                   text PRIMARY KEY         DEFAULT generate_ulid() NOT NULL,
  "user_id"              text                                             NOT NULL,
  "condition_id"         text                                             NOT NULL,
  "token_id"             text                                             NOT NULL,
  "type"                 smallint                                         NOT NULL,
  "side"                 smallint                                         NOT NULL,
  "price"                bigint,
  "share"                bigint,
  "maker_amount"         bigint,
  "status"               text                     DEFAULT 'open'          NOT NULL,
  "maker_address"        text                                             NOT NULL,
  "taker_address"        text                                             NOT NULL,
  "signer_address"       text,
  "salt"                 numeric(78, 0),
  "expiration"           timestamp with time zone,
  "nonce"                bigint,
  "fee_rate_bps"         integer                                          NOT NULL,
  "referrer"             text                                             NOT NULL,
  "affiliate"            text,
  "affiliate_percentage" integer,
  "signature_type"       smallint                 DEFAULT 0,
  "signature"            text,
  "affiliate_user_id"    text,
  "created_at"           timestamp with time zone DEFAULT NOW()           NOT NULL,
  "updated_at"           timestamp with time zone DEFAULT NOW()           NOT NULL,
  CONSTRAINT "orders_type_check" CHECK ("orders"."type" IN (0, 1)),
  CONSTRAINT "orders_side_check" CHECK ("orders"."side" IN (0, 1)),
  CONSTRAINT "orders_status_check" CHECK ("orders"."status" IN ('open', 'filled', 'cancelled'))
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_condition ON orders (condition_id, token_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);

-- ===========================================
-- 3. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE orders
  ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. SECURITY POLICIES
-- ===========================================

CREATE POLICY "service_role_all_orders" ON "orders" AS PERMISSIVE FOR ALL TO "service_role" USING (TRUE) WITH CHECK (TRUE);

-- ===========================================
-- 5. Functions
-- ===========================================

CREATE OR REPLACE FUNCTION get_event_top_holders(
  event_slug_arg TEXT,
  condition_id_arg TEXT DEFAULT NULL,
  limit_arg INTEGER DEFAULT 15
)
  RETURNS TABLE
          (
            user_id       TEXT,
            username      TEXT,
            address       TEXT,
            image         TEXT,
            outcome_index INTEGER,
            outcome_text  TEXT,
            net_position  NUMERIC
          )
  LANGUAGE SQL
  STABLE
  SET search_path = public
AS
$$
WITH event_orders AS (
  -- Get all filled orders for the specific event, optionally filtered by condition_id
  SELECT o.user_id,
         o.side,
         o.maker_amount,
         out.outcome_index,
         out.outcome_text,
         u.username,
         u.address,
         u.image
  FROM orders o
         JOIN outcomes out ON o.token_id = out.token_id
         JOIN conditions c ON out.condition_id = c.id
         JOIN markets m ON c.id = m.condition_id
         JOIN events e ON m.event_id = e.id
         JOIN users u ON o.user_id = u.id
  WHERE e.slug = event_slug_arg
    AND o.status IN ('filled', 'pending')
    AND (condition_id_arg IS NULL OR c.id = condition_id_arg)),
     user_positions AS (
       -- Calculate net positions per user per outcome
       SELECT user_id,
              username,
              address,
              image,
              outcome_index,
              outcome_text,
              SUM(
                CASE
                  WHEN side = 0 THEN maker_amount
                  ELSE maker_amount
                  END
              ) AS net_position
       FROM event_orders
       GROUP BY user_id, username, address, image, outcome_index, outcome_text
       HAVING SUM(
                CASE
                  WHEN side = 0 THEN maker_amount
                  ELSE maker_amount
                  END
              ) > 0),
     ranked_positions AS (
       -- Rank positions within each outcome
       SELECT *,
              ROW_NUMBER() OVER (
                PARTITION BY outcome_index
                ORDER BY net_position DESC
                ) AS rank
       FROM user_positions)
-- Return top holders for each outcome
SELECT user_id,
       username,
       address,
       image,
       outcome_index,
       outcome_text,
       net_position
FROM ranked_positions
WHERE rank <= limit_arg
ORDER BY outcome_index, net_position DESC;
$$;

-- ===========================================
-- 6. TRIGGERS
-- ===========================================

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE
  ON orders
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
