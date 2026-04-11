import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { GatewayService } from '../services/gatewayService.js';

function createFetchMock() {
  return async (url: string | URL | globalThis.Request, init?: RequestInit) => {
    const normalizedUrl = typeof url === 'string' ? url : String(url);

    if (normalizedUrl.includes('/internal/auth/validate')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
        }),
      } as Response;
    }

    if (normalizedUrl.includes('/credits/lock')) {
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/credits/confirm')) {
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/credits/release')) {
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/internal/routing/route')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            output: 'hello',
            tokensInput: 10,
            tokensOutput: 12,
            tokensTotal: 22,
            model: 'gpt-4o',
            provider: 'openai',
          },
        }),
      } as Response;
    }

    throw new Error(`Unexpected fetch URL: ${normalizedUrl}`);
  };
}

function createRedisMockWithStore(store: Map<string, string> = new Map()) {
  const redis = {
    incr: async (key: string) => {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    },
    expire: async () => 1,
    get: async (key: string) => store.get(key) ?? null,
    // redis.set(key, value, 'EX', ttl) — used by validateToken token cache
    set: async (key: string, value: string) => { store.set(key, value); return 'OK'; },
    // redis.setex(key, ttl, value) — used by validateAppAccess app-metadata cache
    setex: async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK' as const;
    },
    del: async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) { if (store.delete(key)) count++; }
      return count;
    },
  } as unknown as Redis;
  return { redis, store };
}

function createRedisMock(store: Map<string, string> = new Map()) {
  return createRedisMockWithStore(store).redis;
}

describe('GatewayService', () => {
  test('allows reserved first-party app IDs without database app lookup', async () => {
    let queryCount = 0;
    const pgPool = {
      query: async () => {
        queryCount += 1;
        return { rows: [], rowCount: 0 };
      },
    } as unknown as Pool;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(),
    }, {
      httpFetch: createFetchMock(),
    });

    const result = await service.processRequest({
      token: 'access-token',
      appId: 'api-direct',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.output, 'hello');
    assert.equal(queryCount, 0);
  });

  test('accepts developer app requests when the provided app key matches a stored hash', async () => {
    let queryCount = 0;
    const pgPool = {
      query: async () => {
        queryCount += 1;
        return { rows: [{ key_hash: 'hashed-key' }], rowCount: 1 };
      },
    } as unknown as Pool;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(),
    }, {
      httpFetch: createFetchMock(),
      compareHash: async (plain, hash) => plain === 'agk_live_key' && hash === 'hashed-key',
    });

    const result = await service.processRequest({
      token: 'access-token',
      appId: 'app-123',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.provider, 'openai');
    assert.equal(queryCount, 1);
  });

  test('rejects developer app requests when the app key does not match', async () => {
    const pgPool = {
      query: async () => ({ rows: [{ key_hash: 'hashed-key' }], rowCount: 1 }),
    } as unknown as Pool;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(),
    }, {
      httpFetch: createFetchMock(),
      compareHash: async () => false,
    });

    await assert.rejects(
      () => service.processRequest({
        token: 'access-token',
        appId: 'app-123',
        appApiKey: 'wrong-key',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_000',
    );
  });

  test('accepts developer app requests authenticated via a signed X-App-Token JWT', async () => {
    const pgPool = {
      // Return a row with a fake encrypted secret; decryption is injected below
      query: async () => ({ rows: [{ client_secret_enc: 'enc-secret' }], rowCount: 1 }),
    } as unknown as Pool;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(),
      clientSecretEncryptionKey: 'a'.repeat(64), // 32-byte hex key
    }, {
      httpFetch: createFetchMock(),
      // Injected decryptSecret returns the raw secret
      decryptSecret: (_enc, _key) => 'my-client-secret',
      // Injected verifyJwt always passes (JWT construction tested separately in utils)
      verifyJwt: (_token, _secret) => ({ clientId: 'client_test', iat: 0, exp: 9999999999 }),
    });

    // Build a minimal JWT whose payload contains a clientId so the gateway can look it up
    const payloadB64 = Buffer.from(JSON.stringify({ clientId: 'client_test', iat: 0, exp: 9999999999 })).toString('base64url');
    const fakeAppJwt = `aGVhZGVy.${payloadB64}.c2lnbmF0dXJl`;

    const result = await service.processRequest({
      token: 'access-token',
      appId: 'app-123',
      appJwt: fakeAppJwt,
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.output, 'hello');
  });

  test('rejects X-App-Token when the verifyJwt check throws', async () => {
    const pgPool = {
      query: async () => ({ rows: [{ client_secret_enc: 'enc-secret' }], rowCount: 1 }),
    } as unknown as Pool;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(),
      clientSecretEncryptionKey: 'a'.repeat(64),
    }, {
      httpFetch: createFetchMock(),
      decryptSecret: (_enc, _key) => 'my-client-secret',
      verifyJwt: () => { throw new Error('Invalid JWT signature'); },
    });

    const payloadB64 = Buffer.from(JSON.stringify({ clientId: 'client_test', iat: 0, exp: 9999999999 })).toString('base64url');
    const fakeAppJwt = `aGVhZGVy.${payloadB64}.d3Jvbmctc2ln`;

    await assert.rejects(
      () => service.processRequest({
        token: 'access-token',
        appId: 'app-123',
        appJwt: fakeAppJwt,
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_000',
    );
  });

  test('caches validated token so the auth service is only called once for repeated requests', async () => {
    let authCallCount = 0;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/validate')) {
        authCallCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
          }),
        } as Response;
      }
      return createFetchMock()(url, init);
    };

    const redisStore = new Map<string, string>();
    const pgPool = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(redisStore),
      tokenCacheTtlSeconds: 60,
    }, { httpFetch: fetchMock });

    const req = { token: 'my-token', appId: 'api-direct', model: 'gpt-4o', messages: [{ role: 'user' as const, content: 'hi' }] };

    await service.processRequest(req);
    await service.processRequest(req);

    assert.equal(authCallCount, 1, 'Auth service should only be called once; second request uses cache');
  });

  test('auth circuit breaker opens after threshold failures and fast-fails subsequent requests', async () => {
    const THRESHOLD = 5;
    let authCallCount = 0;

    const failingFetch = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/validate')) {
        authCallCount += 1;
        throw new Error('Auth service down');
      }
      return createFetchMock()(url, init);
    };

    const pgPool = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(),
    }, { httpFetch: failingFetch });

    const req = { token: 'bad-token', appId: 'api-direct', model: 'gpt-4o', messages: [{ role: 'user' as const, content: 'hi' }] };

    // Drive failures up to (and including) the threshold to open the circuit.
    for (let i = 0; i < THRESHOLD; i++) {
      await assert.rejects(() => service.processRequest(req));
    }

    // The next call should be rejected by the open circuit (not by the auth service).
    const authCallsBeforeOpen = authCallCount;
    await assert.rejects(
      () => service.processRequest(req),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_004',
    );
    assert.equal(authCallCount, authCallsBeforeOpen, 'No additional auth calls should be made when circuit is open');
  });

  test('credit circuit breaker opens after threshold failures and fast-fails lock requests', async () => {
    const THRESHOLD = 5;
    let creditCallCount = 0;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/credits/lock')) {
        creditCallCount += 1;
        throw new Error('Credit service down');
      }
      return createFetchMock()(url, init);
    };

    const pgPool = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;
    const redisStore = new Map<string, string>();

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(redisStore),
      tokenCacheTtlSeconds: 60,
    }, { httpFetch: fetchMock });

    const req = { token: 'my-token', appId: 'api-direct', model: 'gpt-4o', messages: [{ role: 'user' as const, content: 'hi' }] };

    // Drive failures up to (and including) the threshold to open the circuit.
    for (let i = 0; i < THRESHOLD; i++) {
      await assert.rejects(() => service.processRequest(req));
    }

    // The next call should be rejected by the open circuit (not by the credit service).
    const creditCallsBeforeOpen = creditCallCount;
    await assert.rejects(
      () => service.processRequest(req),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_004',
    );
    assert.equal(creditCallCount, creditCallsBeforeOpen, 'No additional credit calls should be made when circuit is open');
  });

  test('circuit breaker resets failure counter on successful calls so intermittent errors do not open the circuit', async () => {
    const THRESHOLD = 5;
    let shouldFail = false;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/validate')) {
        if (shouldFail) throw new Error('Auth service down');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
          }),
        } as Response;
      }
      return createFetchMock()(url, init);
    };

    const pgPool = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;

    // Use a Redis mock that never returns cached tokens so every request reaches the auth service.
    const noopRedis = {
      incr: async () => 1,
      expire: async () => 1,
      get: async (_key: string) => null,
      set: async () => 'OK',
      del: async () => 1,
    } as unknown as Redis;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: noopRedis,
    }, { httpFetch: fetchMock });

    // Use a unique token per call so each iteration starts with a fresh cache miss.
    let counter = 0;
    const makeReq = () => ({
      token: `token-${counter++}`,
      appId: 'api-direct',
      model: 'gpt-4o',
      messages: [{ role: 'user' as const, content: 'hi' }],
    });

    // Alternate failures and successes — the counter should reset on each success.
    for (let i = 0; i < THRESHOLD - 1; i++) {
      shouldFail = true;
      await assert.rejects(() => service.processRequest(makeReq()));
      // A success clears the failure count.
      shouldFail = false;
      await service.processRequest(makeReq());
    }

    // After all those failures+successes the circuit must still be closed.
    shouldFail = false;
    const result = await service.processRequest(makeReq());
    assert.equal(result.output, 'hello', 'Circuit should still be closed after intermittent failures');
  });

  test('falls back to the auth service when the cached token entry is malformed JSON', async () => {
    let authCallCount = 0;
    const redisStore = new Map<string, string>();
    // Seed a malformed (non-JSON) value so the cache-read triggers the fallback.
    redisStore.set(
      `auth:token:${(await import('crypto')).createHash('sha256').update('my-token').digest('hex')}`,
      'not-valid-json{{',
    );

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/validate')) {
        authCallCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
          }),
        } as Response;
      }
      return createFetchMock()(url, init);
    };

    const pgPool = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;
    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: createRedisMock(redisStore),
    }, { httpFetch: fetchMock });

    const result = await service.processRequest({
      token: 'my-token',
      appId: 'api-direct',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hi' }],
    });

    assert.equal(result.output, 'hello');
    assert.equal(authCallCount, 1, 'Auth service should be called when cached entry is malformed');
  });

  // ─── App-metadata cache hit tests ────────────────────────────────────────

  test('serves API-key validation from Redis cache on second request, skipping DB', async () => {
    let queryCount = 0;
    const pgPool = {
      query: async () => {
        queryCount += 1;
        return { rows: [{ key_hash: 'hashed-key' }], rowCount: 1 };
      },
    } as unknown as Pool;

    const redis = createRedisMock();

    const makeService = () => new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis,
    }, {
      httpFetch: createFetchMock(),
      compareHash: async (plain, hash) => plain === 'agk_live_key' && hash === 'hashed-key',
    });

    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-cache-test',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'first request should hit the DB');

    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-cache-test',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'second request should be served from cache without hitting DB');
  });

  test('serves JWT client-secret validation from Redis cache on second request, skipping DB', async () => {
    let queryCount = 0;
    const pgPool = {
      query: async () => {
        queryCount += 1;
        return { rows: [{ client_secret_enc: 'enc-secret' }], rowCount: 1 };
      },
    } as unknown as Pool;

    const redis = createRedisMock();

    const makeService = () => new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis,
      clientSecretEncryptionKey: 'a'.repeat(64),
    }, {
      httpFetch: createFetchMock(),
      decryptSecret: (_enc, _key) => 'my-client-secret',
      verifyJwt: (_token, _secret) => ({ clientId: 'client_cache', iat: 0, exp: 9999999999 }),
    });

    const payloadB64 = Buffer.from(JSON.stringify({ clientId: 'client_cache', iat: 0, exp: 9999999999 })).toString('base64url');
    const fakeAppJwt = `aGVhZGVy.${payloadB64}.c2lnbmF0dXJl`;

    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-jwt-cache',
      appJwt: fakeAppJwt,
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'first JWT request should hit the DB');

    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-jwt-cache',
      appJwt: fakeAppJwt,
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'second JWT request should be served from cache without hitting DB');
  });

  test('serves app-active validation from Redis cache on second request, skipping DB', async () => {
    let queryCount = 0;
    const pgPool = {
      query: async () => {
        queryCount += 1;
        return { rows: [{ id: 'app-active-cache' }], rowCount: 1 };
      },
    } as unknown as Pool;

    const redis = createRedisMock();

    const makeService = () => new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis,
    }, {
      httpFetch: createFetchMock(),
    });

    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-active-cache',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'first active-check request should hit the DB');

    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-active-cache',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'second active-check request should be served from cache without hitting DB');
  });

  test('falls back to DB for API-key auth when Redis.get throws, and does not surface the error', async () => {
    let queryCount = 0;
    const pgPool = {
      query: async () => {
        queryCount += 1;
        return { rows: [{ key_hash: 'hashed-key' }], rowCount: 1 };
      },
    } as unknown as Pool;

    // This mock fails only for app-metadata keys so validateToken (which uses
    // redis.get / redis.set for auth token cache) still works, while
    // validateAppAccess exercises the fail-open Redis path.
    const failingRedis = {
      incr: async () => 1,
      expire: async () => 1,
      get: async (key: string) => {
        if (key.startsWith('app:')) throw new Error('Redis connection failed');
        return null; // auth token: cache miss → calls auth service
      },
      set: async () => 'OK',  // auth token write — must not throw
      setex: async (key: string) => {
        if (key.startsWith('app:')) throw new Error('Redis connection failed');
        return 'OK' as const;
      },
      del: async () => 0,
    } as unknown as Redis;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis: failingRedis,
    }, {
      httpFetch: createFetchMock(),
      compareHash: async (plain, hash) => plain === 'agk_live_key' && hash === 'hashed-key',
    });

    const result = await service.processRequest({
      token: 'access-token',
      appId: 'app-redis-fail',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.output, 'hello', 'request should succeed despite Redis being unavailable for app keys');
    assert.equal(queryCount, 1, 'should fall through to DB when Redis is unavailable');
  });

  test('falls back to DB and evicts malformed cached API-key hashes', async () => {
    let queryCount = 0;
    const pgPool = {
      query: async () => {
        queryCount += 1;
        return { rows: [{ key_hash: 'hashed-key' }], rowCount: 1 };
      },
    } as unknown as Pool;

    const { redis, store } = createRedisMockWithStore();
    // Pre-populate the API-key hashes cache with malformed JSON
    store.set('app:apikeys:app-bad-cache', '{not valid json}');

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis,
    }, {
      httpFetch: createFetchMock(),
      compareHash: async (plain, hash) => plain === 'agk_live_key' && hash === 'hashed-key',
    });

    const result = await service.processRequest({
      token: 'access-token',
      appId: 'app-bad-cache',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.output, 'hello', 'request should succeed after evicting malformed cache entry');
    assert.equal(queryCount, 1, 'should fall through to DB when cached JSON is malformed');
    assert.notEqual(store.get('app:apikeys:app-bad-cache'), '{not valid json}', 'malformed cache entry should have been replaced');
  });

  test('re-queries DB after cache is externally invalidated (simulating API service cache del on key rotation)', async () => {
    let queryCount = 0;
    const pgPool = {
      query: async () => {
        queryCount += 1;
        return { rows: [{ key_hash: 'hashed-key' }], rowCount: 1 };
      },
    } as unknown as Pool;

    const { redis, store } = createRedisMockWithStore();

    const makeService = () => new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      pgPool,
      redis,
    }, {
      httpFetch: createFetchMock(),
      compareHash: async (plain, hash) => plain === 'agk_live_key' && hash === 'hashed-key',
    });

    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-invalidate-test',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'first request should hit DB');

    // Simulate the API service invalidating the cache on API key rotation
    store.delete('app:apikeys:app-invalidate-test');

    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-invalidate-test',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 2, 'should re-query DB after cache is externally invalidated');
  });

});
