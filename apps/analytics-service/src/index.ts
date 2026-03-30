import Fastify from 'fastify';
import { createClient } from '@clickhouse/client';
import { Kafka } from 'kafkajs';
import { getAnalyticsConfig } from '@ai-gateway/config';
import { createLogger, ok } from '@ai-gateway/utils';
import type { UsageEvent } from '@ai-gateway/types';
import type { FastifyRequest, FastifyReply } from 'fastify';

const logger = createLogger('analytics-service');
const config = getAnalyticsConfig();

const app = Fastify({ logger: false });

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

// Batch buffer
let batch: UsageEvent[] = [];
const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 1000;

async function flush(events: UsageEvent[]): Promise<void> {
  if (events.length === 0) return;

  await clickhouse.insert({
    table: 'request_logs',
    values: events.map((e) => ({
      request_id: e.requestId,
      user_id: e.userId,
      app_id: e.appId,
      model: e.model,
      provider: e.provider,
      tokens_input: e.tokensInput,
      tokens_output: e.tokensOutput,
      tokens_total: e.tokensTotal,
      credits_deducted: e.creditsDeducted,
      latency_ms: e.latencyMs,
      success: e.type === 'usage.request.completed' ? 1 : 0,
      error_code: e.errorCode ?? null,
      timestamp: e.timestamp,
    })),
    format: 'JSONEachRow',
  });

  logger.info({ count: events.length }, 'Flushed events to ClickHouse');
}

async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topics: ['usage.events'], fromBeginning: false });

  // Periodic flush
  setInterval(async () => {
    if (batch.length > 0) {
      const toFlush = batch.splice(0, batch.length);
      await flush(toFlush).catch((err) => logger.error(err, 'Flush failed'));
    }
  }, FLUSH_INTERVAL_MS);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (!value) return;

      const event = JSON.parse(value) as UsageEvent;
      batch.push(event);

      if (batch.length >= BATCH_SIZE) {
        const toFlush = batch.splice(0, batch.length);
        await flush(toFlush).catch((err) => logger.error(err, 'Flush failed'));
      }
    },
  });
}

// ─── HTTP API ────────────────────────────────

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

app.get('/health', async () => ({ status: 'ok', service: 'analytics-service' }));

async function bootstrap() {
  void startConsumer();
  await app.listen({ port: config.ANALYTICS_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`📊 Analytics service running on port ${config.ANALYTICS_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start analytics service');
  process.exit(1);
});
