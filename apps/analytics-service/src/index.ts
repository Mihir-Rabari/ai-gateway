import Fastify from 'fastify';
import { createClient } from '@clickhouse/client';
import { Kafka } from 'kafkajs';
import { getAnalyticsConfig } from '@ai-gateway/config';
import { createLogger, getFastifyLoggerOptions, ok } from '@ai-gateway/utils';
import type { UsageEvent } from '@ai-gateway/types';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { UsageBatchBuffer, toRequestLogRow } from './services/usageBatch.js';

const logger = createLogger('analytics-service');
const config = getAnalyticsConfig();

const app = Fastify({ logger: getFastifyLoggerOptions() });

// ─── ClickHouse ───────────────────────────────
const clickhouse = createClient({
  host: config.CLICKHOUSE_HOST,
  username: config.CLICKHOUSE_USER,
  password: config.CLICKHOUSE_PASSWORD,
  database: config.CLICKHOUSE_DATABASE,
});

// ─── Kafka Consumer ───────────────────────────
const kafka = new Kafka({
  clientId: 'analytics-service',
  brokers: config.KAFKA_BROKERS.split(','),
});

const consumer = kafka.consumer({ groupId: 'analytics-ingestion' });

const toClickHouseDateTime64 = (value: Date): string =>
  value.toISOString().replace('T', ' ').replace('Z', '');

// ─── Schema Initialization ────────────────────
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

// Batch buffer
const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 1000;
const batch = new UsageBatchBuffer(BATCH_SIZE);

async function flush(events: UsageEvent[]): Promise<void> {
  if (events.length === 0) return;

  await clickhouse.insert({
    table: 'request_logs',
    values: events.map(toRequestLogRow),
    format: 'JSONEachRow',
  });

  logger.info({ count: events.length }, 'Flushed events to ClickHouse');
}

async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topics: ['usage.events'], fromBeginning: false });

  // Periodic flush
  setInterval(async () => {
    if (batch.size() > 0) {
      const toFlush = batch.drain();
      try {
        await flush(toFlush);
      } catch (err) {
        logger.error(err, 'Flush failed');
      }
    }
  }, FLUSH_INTERVAL_MS);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (!value) return;

      const event = JSON.parse(value) as UsageEvent;
      const toFlush = batch.push(event);
      if (toFlush && toFlush.length > 0) {
        try {
          await flush(toFlush);
        } catch (err) {
          logger.error(err, 'Flush failed');
        }
      }
    },
  });
}

// ─── HTTP API ────────────────────────────────

app.get(
  '/analytics/models',
  async (
    req: FastifyRequest<{ Querystring: { from?: string; to?: string; limit?: string } }>,
    reply: FastifyReply,
  ) => {
    const { from, to, limit } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    const parsedLimit = Number.parseInt(limit ?? '20', 10);
    const topN = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;

    const result = await clickhouse.query({
      query: `
        SELECT
          model,
          count() as total_requests,
          sum(tokens_total) as total_tokens,
          sum(credits_deducted) as total_credits,
          if(count() > 0, countIf(success = 1) / count(), 0) as success_rate,
          avg(latency_ms) as avg_latency_ms
        FROM request_logs
        WHERE timestamp >= {fromDate:DateTime64}
          AND timestamp <= {toDate:DateTime64}
        GROUP BY model
        ORDER BY total_requests DESC
        LIMIT {topN:UInt32}
      `,
      query_params: {
        fromDate: toClickHouseDateTime64(fromDate),
        toDate: toClickHouseDateTime64(toDate),
        topN,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<{
      model: string;
      total_requests: number;
      total_tokens: number;
      total_credits: number;
      success_rate: number;
      avg_latency_ms: number;
    }>();

    return reply.send(
      ok({
        from: fromDate,
        to: toDate,
        rows,
      }),
    );
  },
);

app.get(
  '/analytics/usage/app',
  async (
    req: FastifyRequest<{ Querystring: { appId: string; from?: string; to?: string } }>,
    reply: FastifyReply,
  ) => {
    const { appId, from, to } = req.query;

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
        fromDate: toClickHouseDateTime64(fromDate),
        toDate: toClickHouseDateTime64(toDate),
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json();
    return reply.send(ok({ appId, rows, from: fromDate, to: toDate }));
  },
);

app.get(
  '/analytics/usage/me',
  async (req: FastifyRequest<{ Querystring: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = req.query;
    const result = await clickhouse.query({
      query: `
        SELECT 
          count() as total_requests,
          sum(tokens_total) as total_tokens,
          sum(credits_deducted) as total_credits
        FROM request_logs
        WHERE user_id = {userId:String}
          AND timestamp >= toStartOfMonth(now())
      `,
      query_params: { userId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<{ total_requests: number; total_tokens: number; total_credits: number }>();
    return reply.send(ok(rows[0] ?? { total_requests: 0, total_tokens: 0, total_credits: 0 }));
  },
);

app.get(
  '/analytics/dashboard',
  async (req: FastifyRequest<{ Querystring: { userId: string } }>, reply: FastifyReply) => {
    const { userId } = req.query;

    const thisMonthQuery = `
      SELECT
        count() as total_requests,
        sum(tokens_total) as total_tokens,
        sum(credits_deducted) as total_credits,
        if(count() > 0, countIf(success = 1) / count(), 0) as success_rate,
        avg(latency_ms) as avg_latency_ms
      FROM request_logs
      WHERE user_id = {userId:String}
        AND timestamp >= toStartOfMonth(now())
    `;

    const modelsQuery = `
      SELECT model, count() as count
      FROM request_logs
      WHERE user_id = {userId:String}
        AND timestamp >= toStartOfMonth(now())
      GROUP BY model
      ORDER BY count DESC
      LIMIT 5
    `;

    const last7DaysQuery = `
      SELECT
        toDate(timestamp) as date,
        count() as count
      FROM request_logs
      WHERE user_id = {userId:String}
        AND timestamp >= toDate(now() - INTERVAL 7 DAY)
      GROUP BY date
      ORDER BY date ASC
    `;

    const [thisMonthResult, modelsResult, last7DaysResult] = await Promise.all([
      clickhouse.query({ query: thisMonthQuery, query_params: { userId }, format: 'JSONEachRow' }),
      clickhouse.query({ query: modelsQuery, query_params: { userId }, format: 'JSONEachRow' }),
      clickhouse.query({ query: last7DaysQuery, query_params: { userId }, format: 'JSONEachRow' }),
    ]);

    const thisMonthRows = await thisMonthResult.json<{
      total_requests: number;
      total_tokens: number;
      total_credits: number;
      success_rate: number;
      avg_latency_ms: number;
    }>();

    const modelsRows = await modelsResult.json<{ model: string; count: number }>();
    const last7DaysRows = await last7DaysResult.json<{ date: string; count: number }>();

    const thisMonthStats = thisMonthRows[0] ?? {
      total_requests: 0,
      total_tokens: 0,
      total_credits: 0,
      success_rate: 0,
      avg_latency_ms: 0,
    };

    return reply.send(
      ok({
        thisMonth: {
          totalRequests: thisMonthStats.total_requests,
          totalTokens: thisMonthStats.total_tokens,
          totalCredits: thisMonthStats.total_credits,
          successRate: thisMonthStats.success_rate,
          avgLatencyMs: thisMonthStats.avg_latency_ms,
          topModels: modelsRows,
        },
        last7Days: {
          dailyRequests: last7DaysRows,
        },
      }),
    );
  },
);

app.get('/health', async () => ({ status: 'ok', service: 'analytics-service' }));

async function bootstrap() {
  await initClickHouseSchema();
  void startConsumer();
  await app.listen({ port: config.ANALYTICS_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`📊 Analytics service running on port ${config.ANALYTICS_SERVICE_PORT}`);

  const shutdown = async () => {
    logger.info('Shutting down analytics service...');
    if (batch.size() > 0) {
      try {
        await flush(batch.drain());
      } catch (err) {
        logger.error(err, 'Final flush failed');
      }
    }
    await consumer.disconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start analytics service');
  process.exit(1);
});
