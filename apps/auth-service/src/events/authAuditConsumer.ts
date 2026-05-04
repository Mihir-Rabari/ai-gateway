import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { AuthEvent } from '@ai-gateway/types';

type QueryResultLike = { rowCount?: number };

type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<QueryResultLike>;
};

type LoggerLike = {
  info: (obj: object, msg: string) => void;
  error: (obj: object, msg: string) => void;
  warn: (obj: object, msg: string) => void;
};

const mapAuthEventType = (type: AuthEvent['type']): 'signup' | 'login' | 'logout' | null => {
  if (type === 'user.created') return 'signup';
  if (type === 'user.login') return 'login';
  if (type === 'user.logout') return 'logout';
  return null;
};

const parseEventTimestamp = (timestamp: string): string => {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
};

export async function ingestAuthEvent(
  db: Queryable,
  event: AuthEvent,
  logger: LoggerLike,
): Promise<boolean> {
  const auditType = mapAuthEventType(event.type);
  if (!auditType) {
    logger.warn({ type: event.type }, 'Skipping unsupported auth event type');
    return false;
  }

  if (!event.userId || !event.eventId) {
    logger.warn({ event }, 'Skipping malformed auth event');
    return false;
  }

  const result = await db.query(
    `INSERT INTO user_events (id, user_id, event_type, created_at)
     VALUES ($1, $2, $3, $4::timestamptz)
     ON CONFLICT (id) DO NOTHING`,
    [event.eventId, event.userId, auditType, parseEventTimestamp(event.timestamp)],
  );

  const inserted = (result.rowCount ?? 0) > 0;
  logger.info(
    { eventId: event.eventId, userId: event.userId, eventType: auditType, inserted },
    'Auth audit event processed',
  );
  return inserted;
}

export async function startAuthAuditConsumer(params: {
  db: Queryable;
  logger: LoggerLike;
  clientId?: string;
  brokers?: string;
  groupId?: string;
}): Promise<Consumer> {
  const kafka = new Kafka({
    clientId: params.clientId ?? process.env['KAFKA_CLIENT_ID'] ?? 'auth-service-audit',
    brokers: (params.brokers ?? process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
  });

  const consumer = kafka.consumer({
    groupId: params.groupId ?? process.env['AUTH_AUDIT_CONSUMER_GROUP_ID'] ?? 'auth-service-audit-consumer',
  });

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPICS.AUTH, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      const messageId = `${topic}:${partition}:${message.offset}`;
      try {
        const raw = message.value?.toString();
        if (!raw) return;
        const event = JSON.parse(raw) as AuthEvent;
        await ingestAuthEvent(params.db, event, params.logger);
      } catch (err) {
        params.logger.error({ err, messageId }, 'Failed to process auth audit event');
      }
    },
  });

  params.logger.info(
    { topic: KAFKA_TOPICS.AUTH },
    'Auth audit consumer subscribed',
  );

  return consumer;
}
