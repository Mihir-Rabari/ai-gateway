import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreditService } from '../services/creditService.js';
import { CreditRepository } from '../repositories/creditRepository.js';
import { Errors } from '@ai-gateway/utils';
// Inline mock factories (avoid cross-package import issues)
function createRedisMock() {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => { store.set(key, value); return 'OK' as const; },
    setex: async (key: string, _ttl: number, value: string) => { store.set(key, value); return 'OK' as const; },
    del: async (...keys: string[]) => { let n = 0; keys.forEach(k => { if (store.delete(k)) n++; }); return n; },
    keys: async (pattern: string) => { const r = new RegExp(pattern.replace(/\*/g, '.*')); return [...store.keys()].filter(k => r.test(k)); },
    scan: async (_cursor: string, ...args: unknown[]) => {
      const matchIdx = args.indexOf('MATCH');
      const pattern = matchIdx >= 0 ? args[matchIdx + 1] as string : '*';
      const r = new RegExp(String(pattern).replace(/\*/g, '.*'));
      return ['0', [...store.keys()].filter(k => r.test(k))] as [string, string[]];
    },
    incr: async (key: string) => { const v = (parseInt(store.get(key) ?? '0') + 1).toString(); store.set(key, v); return parseInt(v); },
    expire: async () => 1,
    eval: async () => 1,
    quit: async () => 'OK',
  };
}
function createKafkaMock() {
  const messages: Array<{ topic: string; msg: unknown }> = [];
  return {
    producer: { connect: async () => {}, send: async (topic: string, msg: unknown) => { messages.push({ topic, msg }); } },
    consumer: { connect: async () => {}, subscribe: async () => {}, run: async () => {} },
    _messages: messages,
  };
}
import type { Pool, PoolClient } from 'pg';
import type Redis from 'ioredis';

// Mock config so getCreditConfig() doesn't need real env vars.
vi.mock('@ai-gateway/config', () => ({
  getCreditConfig: () => ({
    CREDIT_SERVICE_PORT: 3005,
    CREDIT_LOCK_TTL_SECONDS: 30,
    FREE_PLAN_CREDITS: 100,
    PRO_PLAN_CREDITS: 1000,
    MAX_PLAN_CREDITS: 5000,
  }),
  KAFKA_TOPICS: {
    AUTH: 'auth.events',
    CREDIT: 'credit.events',
    BILLING: 'billing.events',
    USAGE: 'usage.events',
    ROUTING: 'routing.events',
    ANALYTICS: 'analytics.events',
  },
}));

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function makePgPool(
  queryMock: ReturnType<typeof vi.fn>,
  connectMock: ReturnType<typeof vi.fn>,
): Pool {
  return {
    query: queryMock,
    connect: connectMock,
  } as unknown as Pool;
}

function makePgClient(queryMock: ReturnType<typeof vi.fn>): PoolClient {
  return {
    query: queryMock,
    release: vi.fn(),
  } as unknown as PoolClient;
}

// ───────────────────────────────────────────────────────────────────────────
// CreditService tests
// ───────────────────────────────────────────────────────────────────────────

describe('CreditService', () => {
  let service: CreditService;
  let redis: ReturnType<typeof createRedisMock>;
  let kafka: ReturnType<typeof createKafkaMock>;
  let mockDbQuery: ReturnType<typeof vi.fn>;
  let mockClientQuery: ReturnType<typeof vi.fn>;
  let mockClient: PoolClient;
  let mockConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = createRedisMock();
    kafka = createKafkaMock();
    mockDbQuery = vi.fn();
    mockClientQuery = vi.fn();
    mockClient = makePgClient(mockClientQuery);
    mockConnect = vi.fn().mockResolvedValue(mockClient);

    service = new CreditService(
      makePgPool(mockDbQuery, mockConnect),
      redis as unknown as Redis,
      kafka.producer.send,
    );
  });

  // ── getBalance ─────────────────────────────────────────────────────────

  describe('getBalance', () => {
    it('returns the credit balance for an existing user', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 150 }], rowCount: 1 });

      const balance = await service.getBalance('user-1');
      expect(balance).toBe(150);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'SELECT credit_balance FROM users WHERE id = $1',
        ['user-1'],
      );
    });

    it('returns 0 when the user does not exist', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      expect(await service.getBalance('nobody')).toBe(0);
    });
  });

  // ── check ────────────────────────────────────────────────────────────────

  describe('check', () => {
    it('returns sufficient=true when balance >= required', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 100 }], rowCount: 1 });
      const result = await service.check('user-1', 50);
      expect(result).toEqual({ sufficient: true, balance: 100 });
    });

    it('returns sufficient=true when balance exactly equals required', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 50 }], rowCount: 1 });
      const result = await service.check('user-1', 50);
      expect(result).toEqual({ sufficient: true, balance: 50 });
    });

    it('returns sufficient=false when balance < required', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 10 }], rowCount: 1 });
      const result = await service.check('user-1', 50);
      expect(result).toEqual({ sufficient: false, balance: 10 });
    });
  });

  // ── lock ────────────────────────────────────────────────────────────────

  describe('lock', () => {
    it('acquires a lock when balance is sufficient and key is free', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 100 }], rowCount: 1 });

      await service.lock('user-1', 'req-1', 30);

      // Redis eval was called with the SETNX-style Lua script
      expect(redis.eval).toHaveBeenCalled();
      // Kafka event published
      expect(kafka._messages).toHaveLength(1);
      expect(kafka._messages[0]).toMatchObject({
        topic: 'credit.events',
        msg: { type: 'credit.locked', userId: 'user-1', amount: 30, requestId: 'req-1' },
      });
    });

    it('throws INSUFFICIENT_CREDITS (402) when balance < amount', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 5 }], rowCount: 1 });

      await expect(service.lock('user-1', 'req-1', 30)).rejects.toMatchObject({
        code: 'CREDIT_001',
        statusCode: 402,
      });
      // Lock should not have been attempted in Redis
      expect(redis.eval).not.toHaveBeenCalled();
    });

    it('throws CREDIT_LOCK_FAILED (503) when the lock key already exists', async () => {
      // Pre-populate the lock key so the Lua script returns 0
      redis.set('credit_lock:user-1:req-1', JSON.stringify({ amount: 30, lockedAt: Date.now() }));
      mockDbQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 100 }], rowCount: 1 });

      await expect(service.lock('user-1', 'req-1', 30)).rejects.toMatchObject({
        code: 'CREDIT_002',
        statusCode: 503,
      });
    });
  });

  // ── confirm ─────────────────────────────────────────────────────────────

  describe('confirm', () => {
    it('deducts credits and deletes the lock on first confirm', async () => {
      // transactionExists → false
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
      // Redis lock data
      redis.set('credit_lock:user-1:req-1', JSON.stringify({ amount: 30, lockedAt: Date.now() }));
      // deductCredits query
      mockClientQuery.mockImplementation(async (text: string) => {
        if (text.includes('UPDATE users')) return { rows: [{ credit_balance: 70 }], rowCount: 1 };
        if (text.includes('INSERT INTO credit_transactions')) return { rows: [], rowCount: 0 };
        if (text === 'BEGIN') return { rows: [], rowCount: 0 };
        if (text === 'COMMIT') return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      });

      const result = await service.confirm('user-1', 'req-1');

      expect(result).toEqual({ balanceAfter: 70 });
      // Lock should be deleted from Redis
      expect(await redis.get('credit_lock:user-1:req-1')).toBeNull();
      // Kafka deducted event
      const deductedEvent = kafka._messages.find((m) => (m.msg as { type: string }).type === 'credit.deducted');
      expect(deductedEvent).toBeDefined();
    });

    it('is idempotent — returns current balance if transaction already exists', async () => {
      // transactionExists → true
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
      // getBalance for the idempotent return path
      mockDbQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 70 }], rowCount: 1 });

      const result = await service.confirm('user-1', 'req-1');

      expect(result).toEqual({ balanceAfter: 70 });
      // Should NOT have connected to a transaction client
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('throws CREDIT_LOCK_FAILED when lock data is missing in Redis', async () => {
      // transactionExists → false
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
      // No lock data in Redis

      await expect(service.confirm('user-1', 'req-1')).rejects.toMatchObject({
        code: 'CREDIT_002',
        statusCode: 503,
      });
    });

    it('throws INSUFFICIENT_CREDITS when deductCredits returns null', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
      redis.set('credit_lock:user-1:req-1', JSON.stringify({ amount: 30, lockedAt: Date.now() }));
      // deductCredits returns null (balance check in DB fails)
      mockClientQuery.mockImplementation(async (text: string) => {
        if (text.includes('UPDATE users')) return { rows: [], rowCount: 0 };
        if (text === 'BEGIN') return { rows: [], rowCount: 0 };
        if (text === 'ROLLBACK') return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      });

      await expect(service.confirm('user-1', 'req-1')).rejects.toMatchObject({
        code: 'CREDIT_001',
        statusCode: 402,
      });
    });
  });

  // ── release ─────────────────────────────────────────────────────────────

  describe('release', () => {
    it('deletes the lock and publishes a released event', async () => {
      // transactionExists → false
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
      redis.set('credit_lock:user-1:req-1', JSON.stringify({ amount: 30, lockedAt: Date.now() }));

      await service.release('user-1', 'req-1');

      expect(await redis.get('credit_lock:user-1:req-1')).toBeNull();
      const releasedEvent = kafka._messages.find(
        (m) => (m.msg as { type: string }).type === 'credit.released',
      );
      expect(releasedEvent).toBeDefined();
    });

    it('does nothing if the transaction already exists (already confirmed)', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
      redis.set('credit_lock:user-1:req-1', JSON.stringify({ amount: 30, lockedAt: Date.now() }));

      await service.release('user-1', 'req-1');

      // Lock should still be there since we returned early
      expect(await redis.get('credit_lock:user-1:req-1')).not.toBeNull();
    });

    it('does nothing if no lock data exists in Redis', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });

      await service.release('user-1', 'req-1');
      // No events published
      expect(kafka._messages).toHaveLength(0);
    });
  });

  // ── addCredits ──────────────────────────────────────────────────────────

  describe('addCredits', () => {
    it('adds credits in a transaction and publishes an event', async () => {
      mockClientQuery.mockImplementation(async (text: string) => {
        if (text.includes('UPDATE users')) return { rows: [{ credit_balance: 200 }], rowCount: 1 };
        if (text.includes('INSERT INTO credit_transactions')) return { rows: [], rowCount: 0 };
        if (text === 'BEGIN' || text === 'COMMIT') return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      });

      const result = await service.addCredits('user-1', 100, 'subscription');

      expect(result).toEqual({ balanceAfter: 200 });
      const addedEvent = kafka._messages.find(
        (m) => (m.msg as { type: string }).type === 'credit.added',
      );
      expect(addedEvent).toBeDefined();
    });

    it('throws USER_NOT_FOUND when addCredits returns null', async () => {
      mockClientQuery.mockImplementation(async (text: string) => {
        if (text.includes('UPDATE users')) return { rows: [], rowCount: 0 };
        if (text === 'BEGIN' || text === 'ROLLBACK') return { rows: [], rowCount: 0 };
        return { rows: [], rowCount: 0 };
      });

      await expect(service.addCredits('nobody', 100, 'subscription')).rejects.toMatchObject({
        code: 'AUTH_004',
        statusCode: 404,
      });
    });
  });

  // ── getTransactions ──────────────────────────────────────────────────────

  describe('getTransactions', () => {
    it('returns transactions from the repository', async () => {
      const mockTxs = [
        {
          id: 'tx-1',
          user_id: 'user-1',
          amount: -10,
          type: 'debit',
          reason: 'request',
          request_id: 'req-1',
          balance_after: 90,
          created_at: new Date('2024-01-01'),
        },
      ];
      mockDbQuery.mockResolvedValueOnce({ rows: mockTxs, rowCount: 1 });

      const result = await service.getTransactions('user-1', 20, 0);
      expect(result).toEqual(mockTxs);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM credit_transactions'),
        ['user-1', 20, 0],
      );
    });
  });

  // ── concurrent operations ──────────────────────────────────────────────

  describe('concurrent operations', () => {
    it('two concurrent locks for the same requestId — second fails', async () => {
      mockDbQuery.mockResolvedValue({ rows: [{ credit_balance: 100 }], rowCount: 1 });

      // First lock succeeds (key doesn't exist), second should fail (key exists)
      const [first, second] = await Promise.allSettled([
        service.lock('user-1', 'req-concurrent', 10),
        service.lock('user-1', 'req-concurrent', 10),
      ]);

      // At least one must succeed and at least one must fail
      const successes = [first, second].filter((r) => r.status === 'fulfilled');
      const failures = [first, second].filter(
        (r) => r.status === 'rejected' &&
          (r.reason as { code?: string }).code === 'CREDIT_002',
      );
      expect(successes.length).toBeGreaterThanOrEqual(1);
      expect(failures.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CreditRepository tests
// ───────────────────────────────────────────────────────────────────────────

describe('CreditRepository', () => {
  let repo: CreditRepository;
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockClientQuery: ReturnType<typeof vi.fn>;
  let mockClient: PoolClient;
  let mockConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn();
    mockClientQuery = vi.fn();
    mockClient = makePgClient(mockClientQuery);
    mockConnect = vi.fn().mockResolvedValue(mockClient);
    repo = new CreditRepository(makePgPool(mockQuery, mockConnect));
  });

  it('getBalance returns 0 when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.getBalance('nobody')).toBe(0);
  });

  it('deductCredits returns null when balance check fails (no row updated)', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.deductCredits(mockClient, 'user-1', 999)).toBeNull();
  });

  it('deductCredits returns new balance when successful', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [{ credit_balance: 50 }], rowCount: 1 });
    expect(await repo.deductCredits(mockClient, 'user-1', 50)).toBe(50);
  });

  it('addCredits returns null when user not found', async () => {
    mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.addCredits(mockClient, 'nobody', 100)).toBeNull();
  });

  it('transactionExists returns false on empty result', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.transactionExists('req-1')).toBe(false);
  });

  it('transactionExists returns true when DB reports existence', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
    expect(await repo.transactionExists('req-1')).toBe(true);
  });

  it('getClient returns a connected PoolClient', async () => {
    const client = await repo.getClient();
    expect(client).toBe(mockClient);
    expect(mockConnect).toHaveBeenCalled();
  });
});
