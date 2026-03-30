-- ═══════════════════════════════════════════════════════════════
-- AI Gateway — ClickHouse Analytics Schema
-- ═══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────
-- Main Request Logs Table
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_logs (
  request_id       UUID,
  user_id          UUID,
  app_id           UUID,
  model            String,
  provider         String,
  tokens_input     UInt32,
  tokens_output    UInt32,
  tokens_total     UInt32,
  credits_deducted UInt32,
  latency_ms       UInt32,
  success          UInt8,
  error_code       Nullable(String),
  timestamp        DateTime64(3, 'UTC')
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, user_id)
TTL timestamp + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- ──────────────────────────────────────────────
-- Daily Usage Aggregates (Materialized View)
-- ──────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS usage_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id, app_id, model)
AS
SELECT
  toDate(timestamp)  AS date,
  user_id,
  app_id,
  model,
  provider,
  count()            AS request_count,
  sum(tokens_total)  AS total_tokens,
  sum(credits_deducted) AS total_credits,
  sum(latency_ms)    AS total_latency_ms,
  countIf(success = 1) AS success_count,
  countIf(success = 0) AS error_count
FROM request_logs
GROUP BY date, user_id, app_id, model, provider;

-- ──────────────────────────────────────────────
-- Hourly Request Aggregates (for dashboards)
-- ──────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS usage_hourly
ENGINE = SummingMergeTree()
ORDER BY (hour, model)
AS
SELECT
  toStartOfHour(timestamp) AS hour,
  model,
  provider,
  count()              AS request_count,
  sum(tokens_total)    AS total_tokens,
  sum(credits_deducted) AS total_credits,
  avg(latency_ms)      AS avg_latency_ms
FROM request_logs
GROUP BY hour, model, provider;
