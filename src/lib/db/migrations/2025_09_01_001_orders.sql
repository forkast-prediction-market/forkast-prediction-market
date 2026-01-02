-- ===========================================
-- 1. TABLES
-- ===========================================

CREATE TABLE orders
(
  id                   CHAR(26) PRIMARY KEY     DEFAULT generate_ulid() NOT NULL,
  -- begin blockchain data
  salt                 NUMERIC(78, 0),
  maker                TEXT                                             NOT NULL,
  signer               TEXT                                             NOT NULL,
  taker                TEXT                                             NOT NULL,
  token_id             TEXT                                             NOT NULL,
  maker_amount         BIGINT                                           NOT NULL,
  taker_amount         BIGINT                                           NOT NULL,
  expiration           BIGINT                                           NOT NULL,
  nonce                BIGINT                                           NOT NULL,
  fee_rate_bps         SMALLINT                                         NOT NULL,
  side                 SMALLINT                                         NOT NULL,
  signature_type       SMALLINT                                         NOT NULL,
  signature            TEXT,
  -- end blockchain data
  user_id              TEXT                                             NOT NULL,
  condition_id         TEXT                                             NOT NULL,
  type                 TEXT                                             NOT NULL,
  affiliate_user_id    TEXT,
  clob_order_id        TEXT                                             NOT NULL,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()           NOT NULL,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()           NOT NULL,
  CONSTRAINT orders_type_check CHECK (orders.type IN ('FAK', 'FOK', 'GTC', 'GTD')),
  CONSTRAINT orders_side_check CHECK (orders.side IN (0, 1))
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_condition ON orders (condition_id, token_id);
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
-- 5. TRIGGERS
-- ===========================================
CREATE TRIGGER set_orders_updated_at
  BEFORE
    UPDATE
  ON orders
  FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
