# Analytics Module

## Purpose
Track every request, token usage, cost, and user behavior to power billing accuracy, optimization, and the developer dashboard.

## Responsibilities
- Consume Kafka events and ingest into ClickHouse
- Provide fast analytics queries for dashboards
- Track per-user, per-app, and per-model usage
- Enable cost vs revenue analysis

## ClickHouse Schema

### request_logs
```sql
CREATE TABLE request_logs (
  request_id      UUID,
  user_id         UUID,
  app_id          UUID,
  model           String,
  provider        String,
  tokens_input    UInt32,
  tokens_output   UInt32,
  tokens_total    UInt32,
  credits_deducted UInt32,
  latency_ms      UInt32,
  success         Bool,
  error_code      Nullable(String),
  timestamp       DateTime
) ENGINE = MergeTree()
ORDER BY (timestamp, user_id)
PARTITION BY toYYYYMM(timestamp);
```

### usage_aggregates (materialized view)
```sql
CREATE MATERIALIZED VIEW usage_daily
ENGINE = SummingMergeTree()
ORDER BY (date, user_id, model)
AS SELECT
  toDate(timestamp) as date,
  user_id,
  model,
  count() as requests,
  sum(tokens_total) as total_tokens,
  sum(credits_deducted) as total_credits
FROM request_logs
GROUP BY date, user_id, model;
```

## Kafka → ClickHouse Ingestion
The analytics-service is a Kafka consumer that:
1. Subscribes to `usage.events` topic
2. Batches events (every 1 second or 100 events)
3. Bulk inserts into ClickHouse

```typescript
// Batch insert pattern
const batch: UsageEvent[] = [];
consumer.on('message', (event) => {
  batch.push(event);
  if (batch.length >= 100) flush(batch);
});
setInterval(() => flush(batch), 1000);
```

## Analytics Queries

### User usage this month
```sql
SELECT sum(total_credits) as credits_used, sum(requests) as total_requests
FROM usage_daily
WHERE user_id = ? AND date >= toStartOfMonth(today())
```

### Top models this week
```sql
SELECT model, sum(requests) as count, sum(total_tokens) as tokens
FROM usage_daily
WHERE date >= today() - 7
GROUP BY model
ORDER BY count DESC
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/usage/me` | Access token | User's own usage |
| GET | `/analytics/usage/app/:appId` | Dev token | App usage stats |
| GET | `/analytics/dashboard` | Admin | Platform-wide stats |

## Events Consumed
| Topic | What's ingested |
|-------|----------------|
| `usage.events` | All request completions → `request_logs` |
