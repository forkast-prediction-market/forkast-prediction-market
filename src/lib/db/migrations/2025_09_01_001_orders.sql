-- ===========================================
-- 1. TABLES
-- ===========================================

CREATE TABLE orders
(
  id                   TEXT PRIMARY KEY         DEFAULT generate_ulid() NOT NULL,
  -- begin blockchain data
  salt                 BIGINT,
  maker                TEXT                                             NOT NULL,
  signer               TEXT                                             NOT NULL,
  taker                TEXT                                             NOT NULL,
  referrer             TEXT                                             NOT NULL,
  affiliate            TEXT,
  token_id             TEXT                                             NOT NULL,
  maker_amount         BIGINT                                           NOT NULL,
  taker_amount         BIGINT                                           NOT NULL,
  expiration           BIGINT                                           NOT NULL,
  nonce                BIGINT                                           NOT NULL,
  fee_rate_bps         SMALLINT                                         NOT NULL,
  affiliate_percentage SMALLINT                                         NOT NULL,
  side                 SMALLINT                                         NOT NULL,
  signature_type       SMALLINT                                         NOT NULL,
  signature            TEXT,
  -- end blockchain data
  user_id              TEXT                                             NOT NULL,
  condition_id         TEXT                                             NOT NULL,
  type                 TEXT                                             NOT NULL,
  status               TEXT                     DEFAULT 'live'          NOT NULL,
  affiliate_user_id    TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()           NOT NULL,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()           NOT NULL,
  CONSTRAINT orders_type_check CHECK (orders.type IN ('FAK', 'FOK', 'GTC', 'GTD')),
  CONSTRAINT orders_side_check CHECK (orders.side IN (0, 1)),
  CONSTRAINT orders_status_check CHECK (orders.status IN ('live', 'matched', 'delayed', 'unmatched'))
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_condition ON orders (condition_id, token_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created_at ON orders (created_at);

-- ===========================================
-- 3. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE orders
  ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. SECURITY POLICIES
-- ===========================================

CREATE POLICY service_role_all_orders ON orders AS PERMISSIVE FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ===========================================
-- 5. VIEWS
-- ===========================================

CREATE OR REPLACE VIEW v_user_outcome_positions AS
WITH normalized_orders AS (SELECT o.id,
                                  o.user_id,
                                  o.condition_id,
                                  o.token_id,
                                  o.side,
                                  o.created_at,
                                  CASE
                                    WHEN o.side = 0 THEN o.taker_amount :: NUMERIC
                                    ELSE o.maker_amount :: NUMERIC
                                    END AS shares_micro,
                                  CASE
                                    WHEN o.side = 0 THEN o.maker_amount :: NUMERIC
                                    ELSE o.taker_amount :: NUMERIC
                                    END AS value_micro
                           FROM orders o
                           WHERE o.status = 'matched')
SELECT n.user_id,
       n.condition_id,
       n.token_id,
       out.outcome_index,
       out.outcome_text,
       SUM(
         CASE
           WHEN n.side = 0 THEN n.shares_micro
           ELSE - n.shares_micro
           END
       )                  AS net_shares_micro,
       SUM(
         CASE
           WHEN n.side = 0 THEN n.value_micro
           ELSE 0
           END
       )                  AS total_cost_micro,
       SUM(
         CASE
           WHEN n.side = 1 THEN n.value_micro
           ELSE 0
           END
       )                  AS total_proceeds_micro,
       COUNT(*) :: BIGINT AS order_count,
       MAX(n.created_at)  AS last_activity_at
FROM normalized_orders n
       JOIN outcomes out ON out.token_id = n.token_id
GROUP BY n.user_id,
         n.condition_id,
         n.token_id,
         out.outcome_index,
         out.outcome_text
HAVING SUM(
         CASE
           WHEN n.side = 0 THEN n.shares_micro
           ELSE - n.shares_micro
           END
       ) <> 0;

CREATE OR REPLACE VIEW v_condition_top_holders AS
WITH holder_positions AS (SELECT v.user_id,
                                 v.condition_id,
                                 v.outcome_index,
                                 v.outcome_text,
                                 (v.net_shares_micro / 1000000 :: NUMERIC) AS net_position,
                                 u.username,
                                 u.address,
                                 u.image
                          FROM v_user_outcome_positions v
                                 JOIN users u ON u.id = v.user_id),
     ranked_positions AS (SELECT *,
                                 ROW_NUMBER() OVER (
                                   PARTITION BY condition_id,
                                     outcome_index
                                   ORDER BY
                                     net_position DESC
                                   ) AS rank
                          FROM holder_positions
                          WHERE net_position > 0)
SELECT user_id,
       username,
       address,
       image,
       condition_id,
       outcome_index,
       outcome_text,
       net_position
FROM ranked_positions
WHERE rank <= 15
ORDER BY condition_id,
         outcome_index,
         net_position DESC;

-- ===========================================
-- 6. TRIGGERS
-- ===========================================
CREATE TRIGGER set_orders_updated_at
  BEFORE
    UPDATE
  ON orders
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
