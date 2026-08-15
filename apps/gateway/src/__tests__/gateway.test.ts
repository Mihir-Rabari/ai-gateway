import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GatewayService } from '../services/gatewayService.js';
import { CircuitBreaker } from '../services/circuitBreaker.js';
import { GatewayError, Errors } from '@ai-gateway/utils';
// Inline mock factories
function createRedisMock() {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => { store.set(k, v); return 'OK' as const; },
    setex: async (k: string, _t: number, v: string) => { store.set(k, v); return 'OK' as const; },
    del: async (...keys: string[]) => { let n = 0; keys.forEach(k => { if (store.delete(k)) n++; }); return n; },
    keys: async (p: string) => { const r = new RegExp(p.replace(/\*/g, '.*')); return [...store.keys()].filter(k => r.test(k)); },
    scan: async (_c: string, ...args: unknown[]) => {
      const mi = args.indexOf('MATCH'); const pat = mi >= 0 ? args[mi+1] as string : '*';
      const r = new RegExp(String(pat).replace(/\*/g, '.*'));
      return ['0', [...store.keys()].filter(k => r.test(k))] as [string, string[]];
    },
    incr: async (k: string) => { const v = (parseInt(store.get(k) ?? '0') + 1).toString(); store.set(k, v); return parseInt(v); },
    expire: async () => 1, eval: async () => 1, quit: async () => 'OK',
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
function createFetchMock(config?: { routes: Record<string, () => any> }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    if (config?.routes) {
      for (const [route, handler] of Object.entries(config.routes)) {
        if (url.includes(route)) {
          return handler() as Response;
        }
      }
    }
    const response: Response = {
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: 'test response' } }] }),
      text: async () => JSON.stringify({ choices: [{ message: { content: 'test response' } }] }),
      headers: new Headers(),
    } as unknown as Response;
    return response;
  });
}
import type Redis from 'ioredis';
import type { GatewayResponse } from '@ai-gateway/types';

// Mock config
vi.mock('@ai-gateway/config', () => ({
  KAFKA_TOPICS: {
    AUTH: 'auth.events',
    CREDIT: 'credit.events',
    BILLING: 'billing.events',
    USAGE: 'usage.events',
    ROUTING: 'routing.events',
    ANALYTICS: 'analytics.events',
  },
  FIRST_PARTY_APP_IDS: new Set(['unknown', 'api-direct', 'web-direct', 'web-dashboard']),
}));

// ───────────────────────────────────────────────────────────────────────────
// Fetch mock builder for gateway service
// ───────────────────────────────────────────────────────────────────────────

function makeFetchResponses(options: {
  authResult?: { userId: string; planId: string; email: string } | { error: true; status: number };
  appValidateResult?: 'allowed' | 'invalid_key' | 'forbidden';
  creditLockOk?: boolean;
  creditConfirmOk?: boolean;
  creditReleaseOk?: boolean;
  routingResult?: {
    output: string;
    tokensInput: number;
    tokensOutput: number;
    tokensTotal: number;
    model: string;
    provider: string;
  };
  routingError?: boolean;
} = {}) {
  const {
    authResult = { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
    appValidateResult = 'allowed',
    creditLockOk = true,
    creditConfirmOk = true,
    creditReleaseOk = true,
    routingResult = {
      output: 'hello world',
      tokensInput: 10,
      tokensOutput: 5,
      tokensTotal: 15,
      model: 'gpt-4o',
      provider: 'openai',
    },
    routingError = false,
  } = options;

  return createFetchMock({
    routes: {
      '/internal/auth/validate': () => {
        if ('error' in authResult && authResult.error) {
          return { status: authResult.status, ok: false, json: async () => ({ success: false, error: { code: 'AUTH_001', message: 'bad token', statusCode: 401 } }) };
        }
        return { status: 200, ok: true, json: async () => ({ success: true, data: authResult }) };
      },
      '/internal/auth/apps/validate': () => ({
        status: 200,
        ok: true,
        json: async () => ({ success: true, data: { result: appValidateResult } }),
      }),
      '/credits/lock': () => ({
        status: creditLockOk ? 200 : 402,
        ok: creditLockOk,
        json: async () =>
          creditLockOk
            ? { success: true }
            : { success: false, error: { code: 'CREDIT_001', statusCode: 402 } },
      }),
      '/credits/confirm': () => ({
        status: 200,
        ok: true,
        json: async () => ({ success: creditConfirmOk }),
      }),
      '/credits/release': () => ({
        status: 200,
        ok: true,
        json: async () => ({ success: creditReleaseOk }),
      }),
      '/internal/routing/route': () => {
        if (routingError) {
          return { status: 503, ok: false, json: async () => ({ success: false, error: { code: 'GATEWAY_002', message: 'routing failed' } }) };
        }
        return { status: 200, ok: true, json: async () => ({ success: true, data: routingResult }) };
      },
    },
  });
}

// ───────────────────────────────────────────────────────────────────────────
// GatewayService tests
// ───────────────────────────────────────────────────────────────────────────

describe('GatewayService', () => {
  let redis: ReturnType<typeof createRedisMock>;
  let kafka: ReturnType<typeof createKafkaMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = createRedisMock();
    kafka = createKafkaMock();
  });

  function makeService(fetchMock: ReturnType<typeof makeFetchResponses>, options?: { pgPool?: { query: ReturnType<typeof vi.fn> } }) {
    return new GatewayService(
      {
        authServiceUrl: 'http://auth:3003',
        creditServiceUrl: 'http://credit:3005',
        routingServiceUrl: 'http://routing:3006',
        kafkaPublish: kafka.producer.send.bind(kafka.producer),
        redis: redis as unknown as Redis,
        pgPool: options?.pgPool ?? ({} as never),
        tokenCacheTtlSeconds: 60,
      },
      { httpFetch: fetchMock as never },
    );
  }

  // ── Request routing (happy path) ────────────────────────────────────────

  describe('request routing', () => {
    it('processes a valid request end-to-end and returns a GatewayResponse', async () => {
      const fetchMock = makeFetchResponses();
      const service = makeService(fetchMock);

      const result = await service.processRequest({
        token: 'valid.jwt.token',
        appId: 'unknown',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
        maxTokens: 100,
      });

      expect(result).toMatchObject<GatewayResponse>({
        requestId: expect.any(String),
        output: 'hello world',
        tokensInput: 10,
        tokensOutput: 5,
        tokensTotal: 15,
        creditsDeducted: expect.any(Number),
        model: 'gpt-4o',
        provider: 'openai',
        latencyMs: expect.any(Number),
      });
      // Usage event should be published
      expect(kafka._messages).toHaveLength(1);
      expect(kafka._messages[0]).toMatchObject({ topic: 'usage.events' });
    });

    it('uses the routing result model name (not the requested model) for credit calculation', async () => {
      const fetchMock = makeFetchResponses({
        routingResult: {
          output: 'response',
          tokensInput: 1000,
          tokensOutput: 500,
          tokensTotal: 1500,
          model: 'gpt-3.5-turbo',
          provider: 'openai',
        },
      });
      const service = makeService(fetchMock);

      const result = await service.processRequest({
        token: 'valid.jwt.token',
        appId: 'unknown',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
      });

      // gpt-3.5-turbo has a rate of 1 credit per 1k tokens → 1500 tokens = 2 credits
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.creditsDeducted).toBe(2);
    });
  });

  // ── Auth validation ─────────────────────────────────────────────────────

  describe('auth validation', () => {
    it('throws INVALID_TOKEN (401) when auth service returns error', async () => {
      const fetchMock = makeFetchResponses({
        authResult: { error: true, status: 401 },
      });
      const service = makeService(fetchMock);

      await expect(
        service.processRequest({
          token: 'bad.token',
          appId: 'unknown',
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hi' }],
        }),
      ).rejects.toMatchObject({ code: 'AUTH_001', statusCode: 401 });
    });

    it('caches validated token in Redis for subsequent requests', async () => {
      const fetchMock = makeFetchResponses();
      const service = makeService(fetchMock);

      // First request — hits the auth service
      await service.processRequest({
        token: 'valid.jwt.token',
        appId: 'unknown',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
      });

      // The token cache key should now exist in Redis
      const keys = await redis.keys('auth:token:*');
      expect(keys.length).toBe(1);
    });
  });

  // ── Rate limiting ───────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('allows requests within the plan limit', async () => {
      const fetchMock = makeFetchResponses();
      const service = makeService(fetchMock);

      // free plan limit is 10 req/60s; pro is 60
      const result = await service.processRequest({
        token: 'valid.jwt.token',
        appId: 'unknown',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
      });

      expect(result.requestId).toBeDefined();
    });

    it('throws RATE_LIMIT_EXCEEDED (429) when usage exceeds plan limit', async () => {
      const fetchMock = makeFetchResponses({
        authResult: { userId: 'user-1', planId: 'free', email: 'u@e.com' },
      });
      const service = makeService(fetchMock);

      // free plan limit = 10; exhaust it
      for (let i = 0; i < 10; i++) {
        await service.processRequest({
          token: 'valid.jwt.token',
          appId: 'unknown',
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hi' }],
        });
      }

      // 11th request should be rate limited
      await expect(
        service.processRequest({
          token: 'valid.jwt.token',
          appId: 'unknown',
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hi' }],
        }),
      ).rejects.toMatchObject({ code: 'RATE_LIMIT_EXCEEDED', statusCode: 429 });
    });
  });

  // ── Credit check before forwarding ─────────────────────────────────────

  describe('credit check before forwarding', () => {
    it('throws INSUFFICIENT_CREDITS (402) when credit lock fails', async () => {
      const fetchMock = makeFetchResponses({ creditLockOk: false });
      const service = makeService(fetchMock);

      await expect(
        service.processRequest({
          token: 'valid.jwt.token',
          appId: 'unknown',
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hi' }],
        }),
      ).rejects.toMatchObject({ code: 'CREDIT_001', statusCode: 402 });
    });

    it('releases credits when routing fails after a successful lock', async () => {
      const fetchMock = makeFetchResponses({ routingError: true });
      const service = makeService(fetchMock);

      await expect(
        service.processRequest({
          token: 'valid.jwt.token',
          appId: 'unknown',
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hi' }],
        }),
      ).rejects.toMatchObject({ code: 'GATEWAY_002', statusCode: 503 });

      // A usage.failed event should have been published
      const failedEvent = kafka._messages.find(
        (m) => (m.msg as { type: string }).type === 'usage.request.failed',
      );
      expect(failedEvent).toBeDefined();
    });
  });

  // ── App access validation ──────────────────────────────────────────────

  describe('app access validation', () => {
    it('throws INVALID_APP_KEY (401) when app validation returns invalid_key', async () => {
      const fetchMock = makeFetchResponses({ appValidateResult: 'invalid_key' });
      const service = makeService(fetchMock);

      await expect(
        service.processRequest({
          token: 'valid.jwt.token',
          appId: 'some-app-id',
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hi' }],
        }),
      ).rejects.toMatchObject({ code: 'GATEWAY_000', statusCode: 401 });
    });

    it('throws FORBIDDEN (403) when app validation returns forbidden', async () => {
      const fetchMock = makeFetchResponses({ appValidateResult: 'forbidden' });
      const service = makeService(fetchMock);

      await expect(
        service.processRequest({
          token: 'valid.jwt.token',
          appId: 'some-app-id',
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hi' }],
        }),
      ).rejects.toMatchObject({ code: 'AUTH_003', statusCode: 403 });
    });

    it('skips app validation for first-party app IDs', async () => {
      const fetchMock = makeFetchResponses();
      const service = makeService(fetchMock);

      // "unknown" is in FIRST_PARTY_APP_IDS, so no app validation call
      const result = await service.processRequest({
        token: 'valid.jwt.token',
        appId: 'unknown',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hi' }],
      });

      expect(result.output).toBe('hello world');
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CircuitBreaker tests
// ───────────────────────────────────────────────────────────────────────────

describe('CircuitBreaker', () => {
  it('starts in closed state and passes requests through', async () => {
    const breaker = new CircuitBreaker({ serviceName: 'test' });
    expect(breaker.getState()).toBe('closed');

    const result = await breaker.execute(async () => 'ok');
    expect(result).toBe('ok');
    expect(breaker.getState()).toBe('closed');
  });

  it('opens after reaching the failure threshold', async () => {
    const breaker = new CircuitBreaker({ serviceName: 'test', failureThreshold: 3 });

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    }

    expect(breaker.getState()).toBe('open');
  });

  it('rejects calls fast with GATEWAY_004 when open', async () => {
    const breaker = new CircuitBreaker({ serviceName: 'test', failureThreshold: 1, resetTimeoutMs: 60000 });

    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('open');

    await expect(breaker.execute(async () => 'ok')).rejects.toMatchObject({
      code: 'GATEWAY_004',
      statusCode: 503,
    });
  });

  it('resets failure count on a successful call', async () => {
    const breaker = new CircuitBreaker({ serviceName: 'test', failureThreshold: 3 });

    // Two failures
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();

    // Success resets the counter
    await breaker.execute(async () => 'ok');
    expect(breaker.getState()).toBe('closed');

    // Two more failures should NOT open (counter was reset)
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(breaker.getState()).toBe('closed');
  });

  it('transitions to half-open after resetTimeout and closes on probe success', async () => {
    const breaker = new CircuitBreaker({ serviceName: 'test', failureThreshold: 1, resetTimeoutMs: 50 });

    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(breaker.getState()).toBe('open');

    // Wait for reset timeout
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Probe call succeeds → circuit closes
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('closed');
  });

  it('re-opens if the probe call fails in half-open state', async () => {
    const breaker = new CircuitBreaker({ serviceName: 'test', failureThreshold: 1, resetTimeoutMs: 50 });

    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 60));

    await expect(breaker.execute(async () => { throw new Error('still failing'); })).rejects.toThrow();
    expect(breaker.getState()).toBe('open');
  });
});
