import { createLogger, generateId } from '@ai-gateway/utils';
import { Kafka, type Consumer } from 'kafkajs';
import { Pool } from 'pg';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { UsageEvent } from '@ai-gateway/types';

const logger = createLogger('worker');

// ─── Database ────────────────────────────────
const db = new Pool({ connectionString: process.env['DATABASE_URL'] });

// ─── Kafka ───────────────────────────────────
const kafka = new Kafka({
  clientId: 'ai-gateway-worker',
  brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
});

// ─── Usage Events Consumer ───────────────────

async function processUsageEvent(event: UsageEvent): Promise<void> {
  if (event.type !== 'usage.request.completed') return;

  // Revenue split: 20% to developer
  const appEarning = Math.floor(event.creditsDeducted * 0.2);

  // Update dev wallet
  await db.query(
    `INSERT INTO dev_wallet_transactions (id, app_id, request_id, credits_earned, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT DO NOTHING`,
    [generateId(), event.appId, event.requestId, appEarning],
  );

  await db.query(
    `UPDATE dev_wallets SET balance = balance + $1, total_earned = total_earned + $1, updated_at = NOW()
     WHERE developer_id = (SELECT developer_id FROM registered_apps WHERE id = $2)`,
    [appEarning, event.appId],
  );

  logger.info({ requestId: event.requestId, appId: event.appId, earning: appEarning }, 'Revenue split processed');
}

async function startConsumers(): Promise<void> {
  const consumer: Consumer = kafka.consumer({ groupId: 'ai-gateway-worker' });

  await consumer.connect();
  logger.info('✅ Kafka consumer connected');

  await consumer.subscribe({
    topics: [KAFKA_TOPICS.USAGE, KAFKA_TOPICS.AUTH, KAFKA_TOPICS.BILLING],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const value = message.value?.toString();
        if (!value) return;

        const event = JSON.parse(value) as { topic: string; type: string } & UsageEvent;

        switch (topic) {
          case KAFKA_TOPICS.USAGE:
            await processUsageEvent(event as UsageEvent);
            break;
          default:
            logger.debug({ topic, type: event.type }, 'Event received');
        }
      } catch (err) {
        logger.error({ err, topic }, 'Error processing Kafka message');
      }
    },
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down worker');
    await consumer.disconnect();
    await db.end();
    process.exit(0);
  });
}

startConsumers().catch((err) => {
  logger.error(err, 'Worker failed to start');
  process.exit(1);
});
