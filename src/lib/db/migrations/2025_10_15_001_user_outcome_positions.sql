-- ===========================================
-- User outcome positions view + holders function
-- ===========================================

CREATE OR REPLACE VIEW v_user_outcome_positions AS
WITH normalized_orders AS (
  SELECT
    o.id,
    o.user_id,
    o.condition_id,
    o.token_id,
    o.side,
    o.created_at,
    CASE
      WHEN o.side = 0 THEN o.taker_amount::numeric
      ELSE o.maker_amount::numeric
    END AS shares_micro,
    CASE
      WHEN o.side = 0 THEN o.maker_amount::numeric
      ELSE o.taker_amount::numeric
    END AS value_micro
  FROM orders o
  WHERE o.status = 'matched'
)
SELECT
  n.user_id,
  n.condition_id,
  n.token_id,
  out.outcome_index,
  out.outcome_text,
  SUM(
    CASE
      WHEN n.side = 0 THEN n.shares_micro
      ELSE -n.shares_micro
    END
  ) AS net_shares_micro,
  SUM(
    CASE
      WHEN n.side = 0 THEN n.value_micro
      ELSE 0
    END
  ) AS total_cost_micro,
  SUM(
    CASE
      WHEN n.side = 1 THEN n.value_micro
      ELSE 0
    END
  ) AS total_proceeds_micro,
  COUNT(*)::bigint AS order_count,
  MAX(n.created_at) AS last_activity_at
FROM normalized_orders n
JOIN outcomes out ON out.token_id = n.token_id
GROUP BY
  n.user_id,
  n.condition_id,
  n.token_id,
  out.outcome_index,
  out.outcome_text
HAVING
  SUM(
    CASE
      WHEN n.side = 0 THEN n.shares_micro
      ELSE -n.shares_micro
    END
  ) <> 0;

-- ===========================================
-- Update get_event_top_holders to leverage the view
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
WITH holder_positions AS (
  SELECT
    v.user_id,
    v.condition_id,
    v.outcome_index,
    v.outcome_text,
    (v.net_shares_micro / 1000000::numeric) AS net_position,
    u.username,
    u.address,
    u.image
  FROM v_user_outcome_positions v
  JOIN users u ON u.id = v.user_id
  JOIN markets m ON m.condition_id = v.condition_id
  JOIN events e ON e.id = m.event_id
  WHERE e.slug = event_slug_arg
    AND (condition_id_arg IS NULL OR v.condition_id = condition_id_arg)
),
ranked_positions AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY outcome_index
      ORDER BY net_position DESC
    ) AS rank
  FROM holder_positions
  WHERE net_position > 0
)
SELECT
  user_id,
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
-- Ensure affiliate helper functions only consider matched orders
-- ===========================================

CREATE OR REPLACE FUNCTION get_affiliate_stats(target_user_id CHAR(26))
  RETURNS TABLE
          (
            total_referrals      BIGINT,
            active_referrals     BIGINT,
            total_volume         NUMERIC,
            total_affiliate_fees NUMERIC,
            total_fork_fees      NUMERIC
          )
  LANGUAGE SQL
  STABLE
  SET search_path = public
AS
$$
SELECT COALESCE((SELECT COUNT(*) FROM affiliate_referrals ar WHERE ar.affiliate_user_id = target_user_id),
                0)                                  AS total_referrals,
       COALESCE((SELECT COUNT(DISTINCT o.user_id)
                 FROM orders o
                 WHERE o.affiliate_user_id = target_user_id
                   AND o.status = 'matched'), 0) AS active_referrals,
       COALESCE((SELECT SUM(o.maker_amount)
                 FROM orders o
                 WHERE o.affiliate_user_id = target_user_id
                   AND o.status = 'matched'), 0) AS total_volume,
       COALESCE((SELECT SUM(o.affiliate_percentage)
                 FROM orders o
                 WHERE o.affiliate_user_id = target_user_id
                   AND o.status = 'matched'), 0) AS total_affiliate_fees,
       COALESCE((SELECT SUM(o.affiliate_percentage)
                 FROM orders o
                 WHERE o.affiliate_user_id = target_user_id
                   AND o.status = 'matched'), 0) AS total_fork_fees;
$$;

CREATE OR REPLACE FUNCTION get_affiliate_overview()
  RETURNS TABLE
          (
            affiliate_user_id    CHAR(26),
            total_referrals      BIGINT,
            total_volume         NUMERIC,
            total_affiliate_fees NUMERIC
          )
  LANGUAGE SQL
  STABLE
  SET search_path = public
AS
$$
SELECT u.id                                  AS affiliate_user_id,
       COALESCE(ar.count_referrals, 0)       AS total_referrals,
       COALESCE(ord.total_volume, 0)         AS total_volume,
       COALESCE(ord.total_affiliate_fees, 0) AS total_affiliate_fees
FROM users u
       LEFT JOIN (SELECT affiliate_user_id, COUNT(*) AS count_referrals
                  FROM affiliate_referrals
                  GROUP BY affiliate_user_id) ar ON ar.affiliate_user_id = u.id
       LEFT JOIN (SELECT affiliate_user_id,
                         SUM(CASE WHEN status = 'matched' THEN maker_amount ELSE 0 END)               AS total_volume,
                         SUM(CASE WHEN status = 'matched' THEN affiliate_percentage ELSE 0 END) AS total_affiliate_fees
                  FROM orders
                  WHERE affiliate_user_id IS NOT NULL
                  GROUP BY affiliate_user_id) ord ON ord.affiliate_user_id = u.id
WHERE ar.count_referrals IS NOT NULL
   OR ord.total_volume IS NOT NULL
ORDER BY COALESCE(ord.total_volume, 0) DESC
LIMIT 100;
$$;
