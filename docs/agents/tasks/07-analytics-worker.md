# Agent 7 — Analytics Service + Worker

**Owner:** Agent 7
**Scope:** `apps/analytics-service/`, `apps/worker/`
**Must NOT touch:** Other services, shared packages (read only)

---

## Your Mission

You are the data layer. Every AI request generates events — you must capture all of them reliably, make them queryable, and ensure developer revenue splits happen accurately. Losing events = losing money and trust.

---

## Current State

### Analytics Service
- ✅ Kafka consumer for `usage.events`
- ✅ Batch insertion to ClickHouse
- ✅ GET /analytics/usage/me?userId=
- ❌ ClickHouse schema not initializing properly (doesn't use `initdb.d`)
- ❌ Missing per-app analytics endpoint
- ❌ Missing dashboard summary endpoint

### Worker
- ✅ Kafka consumer running
- ✅ Revenue split logic (20% to developer)
- ❌ Not handling `billing.events`
- ❌ Not handling `auth.events`
- ❌ Dead letter logging missing

---

## Tasks

### Task 1 — Fix ClickHouse Schema Initialization

ClickHouse does NOT use `/docker-entrypoint-initdb.d/` like PostgreSQL.

You need to initialize the schema via HTTP API on service startup:

```typescript
// In analytics-service/src/index.ts

async function initClickHouseSchema(): Promise<void> {
  const SCHEMA = `
    CREATE TABLE IF NOT EXISTS request_logs (
      request_id String,
      user_id String,
      app_id String,
      model String,
      provider String,
      tokens_input UInt32,
      tokens_output UInt32,
      tokens_total UInt32,
      credits_deducted UInt32,
      latency_ms UInt32,
      success UInt8,
      error_code Nullable(String),
      timestamp DateTime64(3)
    ) ENGINE = MergeTree()
    ORDER BY (timestamp, user_id)
    PARTITION BY toYYYYMM(timestamp);
  `;
  
  await clickhouse.exec({ query: SCHEMA });
  logger.info('ClickHouse schema initialized');
}

// Call this in bootstrap() before starting consumer
await initClickHouseSchema();
```

### Task 2 — GET /analytics/usage/app?appId=

For developers to see usage of their app:

```typescript
fastify.get('/analytics/usage/app', async (req, reply) => {
  const { appId, from, to } = req.query as {
    appId: string;
    from?: string;   // ISO date string
    to?: string;
  };
  
  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();
  
  const result = await clickhouse.query({
    query: `
      SELECT
        count() as total_requests,
        sum(tokens_total) as total_tokens,
        sum(credits_deducted) as total_credits,
        model,
        countIf(success = 1) as successful_requests,
        avg(latency_ms) as avg_latency_ms
      FROM request_logs
      WHERE app_id = {appId:String}
        AND timestamp >= {fromDate:DateTime64}
        AND timestamp <= {toDate:DateTime64}
      GROUP BY model
      ORDER BY total_requests DESC
    `,
    query_params: {
      appId,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    },
    format: 'JSONEachRow',
  });
  
  const rows = await result.json();
  return reply.send(ok({ appId, rows, from: fromDate, to: toDate }));
});
```

### Task 3 — GET /analytics/dashboard?userId=

Summary endpoint for the dashboard overview page:

```typescript
// Returns:
{
  thisMonth: {
    totalRequests: number,
    totalTokens: number,
    totalCredits: number,
    successRate: number,    // 0-1
    avgLatencyMs: number,
    topModels: [{ model, count }],
  },
  last7Days: {
    dailyRequests: [{ date, count }],  // last 7 days
  }
}
```

### Task 4 — Worker: Handle Billing Events

In `worker/src/index.ts`, add handler for `billing.events`:

```typescript
case KAFKA_TOPICS.BILLING: {
  const billingEvent = event as BillingEvent;
  if (billingEvent.type === 'billing.subscription.created' || 
      billingEvent.type === 'billing.subscription.renewed') {
    // Log subscription event to analytics
    logger.info({ userId: billingEvent.userId, plan: billingEvent.planId }, 'Subscription event received');
    // Could store in Postgres billing_events table for admin reporting
  }
  break;
}
```

### Task 5 — Worker: Handle Auth Events

```typescript
case KAFKA_TOPICS.AUTH: {
  const authEvent = event as AuthEvent;
  if (authEvent.type === 'auth.user.created') {
    // Track new user signup
    await db.query(
      'INSERT INTO user_events (user_id, event_type, created_at) VALUES ($1, $2, NOW())',
      [authEvent.userId, 'signup']
    );
  }
  break;
}
```

Note: `user_events` table needs to be defined in schema — document this for Agent 1.

### Task 6 — Dead Letter Logging

When a Kafka message fails processing, don't silently drop it:

```typescript
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const messageId = `${topic}:${partition}:${message.offset}`;
    try {
      // ... process message
    } catch (err) {
      logger.error(
        { err, topic, messageId, value: message.value?.toString() },
        'Failed to process Kafka message — writing to dead letter log'
      );
      // Optionally: write to a dead_letter_log table in Postgres
    }
  },
});
```

### Task 7 — Graceful Shutdown for Analytics

The current analytics service may lose buffered events on shutdown:

```typescript
// In bootstrap():
const shutdown = async () => {
  logger.info('Shutting down analytics service...');
  // Flush remaining batch before closing
  if (batch.length > 0) {
    await flush(batch).catch((err) => logger.error(err, 'Final flush failed'));
  }
  await consumer.disconnect();
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
```

---

## ClickHouse Schema Reference

```sql
-- request_logs
CREATE TABLE IF NOT EXISTS request_logs (
  request_id String,
  user_id String,
  app_id String,
  model String,
  provider String,
  tokens_input UInt32,
  tokens_output UInt32,
  tokens_total UInt32,
  credits_deducted UInt32,
  latency_ms UInt32,
  success UInt8,
  error_code Nullable(String),
  timestamp DateTime64(3)
) ENGINE = MergeTree()
ORDER BY (timestamp, user_id)
PARTITION BY toYYYYMM(timestamp);

-- credit_events
CREATE TABLE IF NOT EXISTS credit_events (
  event_id String,
  user_id String,
  event_type String,
  amount Int32,
  balance_after Int32,
  timestamp DateTime64(3)
) ENGINE = MergeTree()
ORDER BY (timestamp, user_id);
```

---

## Env Vars

```env
ANALYTICS_SERVICE_PORT=3007
KAFKA_BROKERS=
CLICKHOUSE_HOST=http://localhost:8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=ai_gateway_analytics
DATABASE_URL=      # worker needs this for Postgres writes
```
