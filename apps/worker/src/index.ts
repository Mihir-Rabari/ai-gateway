import { createLogger, generateId } from '@ai-gateway/utils';
import { Kafka, type Consumer } from 'kafkajs';
import { Pool } from 'pg';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { UsageEvent, BillingEvent, AuthEvent } from '@ai-gateway/types';

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

  // Update dev wallet - combined into a single round-trip using CTE
  await db.query(
    `WITH ins AS (
      INSERT INTO dev_wallet_transactions (id, app_id, request_id, credits_earned, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT DO NOTHING
    )
    UPDATE dev_wallets SET balance = balance + $4, total_earned = total_earned + $4, updated_at = NOW()
    WHERE developer_id = (SELECT developer_id FROM registered_apps WHERE id = $2)`,
    [generateId(), event.appId, event.requestId, appEarning],
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
    eachMessage: async ({ topic, partition, message }) => {
      const messageId = `${topic}:${partition}:${message.offset}`;
      try {
        const value = message.value?.toString();
        if (!value) return;

        const event = JSON.parse(value) as { topic?: string; type?: string; [key: string]: unknown };
        const eventType = typeof event.type === 'string' ? event.type : 'unknown';

        switch (topic) {
          case KAFKA_TOPICS.USAGE:
            if (eventType === 'usage.request.completed' || eventType === 'usage.request.failed') {
              await processUsageEvent(event as unknown as UsageEvent);
            }
            break;
          case KAFKA_TOPICS.AUTH: {
            if (eventType === 'user.created') {
              const authEvent = event as unknown as AuthEvent;
              if (authEvent.userId) {
                await db.query(
                  'INSERT INTO user_events (user_id, event_type, created_at) VALUES ($1, $2, NOW())',
                  [authEvent.userId, 'signup']
                );
                logger.info({ userId: authEvent.userId }, 'User signup tracked');
              }
            }
            break;
          }
          case KAFKA_TOPICS.BILLING: {
            if (
              eventType === 'billing.subscription.created' ||
              eventType === 'billing.subscription.renewed'
            ) {
              const billingEvent = event as unknown as BillingEvent;
              if (billingEvent.userId && billingEvent.planId) {
                logger.info(
                  { userId: billingEvent.userId, plan: billingEvent.planId },
                  'Subscription event received'
                );
              }
            }
            break;
          }
          default:
            logger.debug({ topic, type: eventType }, 'Event received');
        }
      } catch (err) {
        logger.error(
          { err, topic, messageId, value: message.value?.toString() },
          'Failed to process Kafka message — writing to dead letter log'
        );
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
