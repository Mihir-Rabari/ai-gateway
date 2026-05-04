import test from 'node:test';
import assert from 'node:assert/strict';
import Redis from 'ioredis';
import type { Pool } from 'pg';
import type { CreditEvent } from '@ai-gateway/types';
import { CreditService } from '../services/creditService.js';

test('CreditService lock/release works with a real Redis instance', async (t) => {
  const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    connectTimeout: 1000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  redis.on('error', () => undefined);

  try {
    await redis.connect();
    await redis.ping();
  } catch {
    t.skip('Redis is not reachable for integration test');
    await redis.quit().catch(() => undefined);
    return;
  }

  const mockDb = {
    query: async (query: string) => {
      if (query.includes('SELECT credit_balance FROM users WHERE id = $1')) {
        return { rows: [{ credit_balance: 100 }] };
      }

      if (query.includes('SELECT EXISTS(SELECT 1 FROM credit_transactions WHERE request_id = $1)')) {
        return { rows: [{ exists: false }] };
      }

      return { rows: [] };
    },
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => undefined,
    }),
  } as unknown as Pool;

  const publishedEvents: CreditEvent['type'][] = [];
  const service = new CreditService(
    mockDb,
    redis,
    async (_topic: string, message: object) => {
      const event = message as { type?: CreditEvent['type'] };
      if (event.type) {
        publishedEvents.push(event.type);
      }
    },
  );

  const userId = `redis-integration-user-${Date.now()}`;
  const requestId = `redis-integration-req-${Date.now()}`;
  const lockKey = `credit_lock:${userId}:${requestId}`;

  try {
    await service.lock(userId, requestId, 10);
    const lockPayload = await redis.get(lockKey);
    assert.ok(lockPayload);

    await service.release(userId, requestId);
    const releasedPayload = await redis.get(lockKey);
    assert.equal(releasedPayload, null);

    assert.ok(publishedEvents.includes('credit.locked'));
    assert.ok(publishedEvents.includes('credit.released'));
  } finally {
    await redis.del(lockKey);
    await redis.quit();
  }
});
