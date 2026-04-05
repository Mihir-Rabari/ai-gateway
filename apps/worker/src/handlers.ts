import { generateId } from '@ai-gateway/utils';
import type { BillingEvent, AuthEvent, UsageEvent } from '@ai-gateway/types';

type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

type LoggerLike = {
  info: (obj: object, msg: string) => void;
};

export async function processUsageEvent(
  db: Queryable,
  event: UsageEvent,
  logger: LoggerLike,
  idFactory: () => string = generateId,
): Promise<void> {
  if (event.type !== 'usage.request.completed') return;

  const appEarning = Math.floor(event.creditsDeducted * 0.2);

  await db.query(
    `WITH ins AS (
      INSERT INTO dev_wallet_transactions (id, app_id, request_id, credits_earned, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT DO NOTHING
    )
    UPDATE dev_wallets SET balance = balance + $4, total_earned = total_earned + $4, updated_at = NOW()
    WHERE developer_id = (SELECT developer_id FROM registered_apps WHERE id = $2)`,
    [idFactory(), event.appId, event.requestId, appEarning],
  );

  logger.info({ requestId: event.requestId, appId: event.appId, earning: appEarning }, 'Revenue split processed');
}

export async function processAuthEvent(
  db: Queryable,
  event: AuthEvent,
  logger: LoggerLike,
  idFactory: () => string = generateId,
): Promise<void> {
  const mappedType =
    event.type === 'user.created' ? 'signup'
    : event.type === 'user.login' ? 'login'
    : event.type === 'user.logout' ? 'logout'
    : null;

  if (!mappedType) return;

  await db.query(
    'INSERT INTO user_events (id, user_id, event_type, created_at) VALUES ($1, $2, $3, NOW())',
    [idFactory(), event.userId, mappedType],
  );

  logger.info({ userId: event.userId, eventType: mappedType }, 'User event tracked');
}

export async function processBillingEvent(_event: BillingEvent, logger: LoggerLike): Promise<void> {
  logger.info({ eventType: _event.type, userId: _event.userId, planId: _event.planId }, 'Subscription event received');
}
