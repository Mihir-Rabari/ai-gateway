import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { CreditService } from '../services/creditService.js';
import type { Pool, PoolClient } from 'pg';
import type Redis from 'ioredis';

describe('CreditService', () => {
  let service: CreditService;
  let mockDb: Record<string, ReturnType<typeof mock.fn>>;
  let mockClient: Record<string, ReturnType<typeof mock.fn>>;
  let mockRedis: Record<string, ReturnType<typeof mock.fn>>;
  let mockKafkaPublish: ReturnType<typeof mock.fn<any, any>>;

  beforeEach(() => {
    mockClient = {
      query: mock.fn(async () => ({ rows: [] })),
      release: mock.fn(),
    };
    mockDb = {
      query: mock.fn(async () => ({ rows: [] })),
      connect: mock.fn(async () => mockClient),
    };
    mockRedis = {
      get: mock.fn(async () => null),
      setnx: mock.fn(async () => 1),
      expire: mock.fn(async () => 1),
      del: mock.fn(async () => 1),
      eval: mock.fn(async () => 1),
    };
    mockKafkaPublish = mock.fn(async (_topic: string, _msg: object) => {});
    service = new CreditService(mockDb as unknown as Pool, mockRedis as unknown as Redis, mockKafkaPublish as unknown as ((topic: string, msg: object) => Promise<void>));
  });

  test('lock and confirm deducts credits atomically', async () => {
    // lock
    const mockDbQuery = mock.fn(async () => ({ rows: [{ credit_balance: 100 }] }));
    mockDb.query = mockDbQuery;

    await service.lock('user-1', 'req-1', 10);
    assert.strictEqual(mockRedis.eval?.mock.calls.length, 1);

    // confirm
    const mockRedisGet = mock.fn(async () => JSON.stringify({ amount: 10, lockedAt: Date.now() }));
    mockRedis.get = mockRedisGet as any;

    // deduct query succeeds, insert tx succeeds
    const mockClientQuery = mock.fn(async (q: string) => {
      if (q.includes('UPDATE users')) return { rows: [{ credit_balance: 90 }] };
      if (q.includes('SELECT EXISTS')) return { rows: [{ exists: false }] };
      return { rows: [] };
    });
    mockClient.query = mockClientQuery as any;

    const res = await service.confirm('user-1', 'req-1');
    assert.strictEqual(res.balanceAfter, 90);
    assert.strictEqual(mockRedis.del?.mock.calls.length, 1);
  });

  test('double confirm is idempotent', async () => {
    // first confirm query checking exists returns true
    const mockDbQuery = mock.fn(async (q: string) => {
      if (q.includes('SELECT EXISTS')) return { rows: [{ exists: true }] };
      if (q.includes('SELECT credit_balance')) return { rows: [{ credit_balance: 90 }] };
      return { rows: [] };
    });
    mockDb.query = mockDbQuery;

    const res = await service.confirm('user-1', 'req-1');
    assert.strictEqual(res.balanceAfter, 90);

    // lock data should not be deleted again
    assert.strictEqual(mockRedis.del?.mock.calls.length, 0);
  });

  test('lock fails if insufficient balance', async () => {
    const mockDbQuery = mock.fn(async () => ({ rows: [{ credit_balance: 5 }] }));
    mockDb.query = mockDbQuery;

    try {
      await service.lock('user-1', 'req-1', 10);
      assert.fail('Should have thrown INSUFFICIENT_CREDITS');
    } catch (err: unknown) {
      assert.strictEqual((err as { code: string }).code, 'CREDIT_001');
    }
  });

  test('release removes lock and publishes event', async () => {
    const mockRedisGet = mock.fn(async () => JSON.stringify({ amount: 10, lockedAt: Date.now() }));
    mockRedis.get = mockRedisGet;

    await service.release('user-1', 'req-1');

    assert.strictEqual(mockRedis.del?.mock.calls.length, 1);
    assert.strictEqual(mockKafkaPublish.mock.calls.length, 1);
    const publishedEvent = mockKafkaPublish.mock.calls[0]?.arguments[1] as { type: string };
    assert.strictEqual(publishedEvent.type, 'credit.released');
  });

  test('addCredits increases balance correctly', async () => {
    const mockClientQuery = mock.fn(async (q: string) => {
      if (q.includes('UPDATE users')) return { rows: [{ credit_balance: 110 }] };
      return { rows: [] };
    });
    mockClient.query = mockClientQuery as any;

    const res = await service.addCredits('user-1', 10, 'subscription');
    assert.strictEqual(res.balanceAfter, 110);
    assert.strictEqual(mockKafkaPublish.mock.calls.length, 1);
    const publishedEvent = mockKafkaPublish.mock.calls[0]?.arguments[1] as { type: string };
    assert.strictEqual(publishedEvent.type, 'credit.added');
  });
});
