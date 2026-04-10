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
        json: async () => ({
          success: true,
          data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
        }),
      } as Response;
    }

    if (normalizedUrl.includes('/credits/lock')) {
      return { json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/credits/confirm')) {
      return { json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/credits/release')) {
      return { json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/internal/routing/route')) {
      return {
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

function createRedisMock(store: Map<string, string> = new Map()) {
  return {
    incr: async () => 1,
    expire: async () => 1,
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => { store.set(key, value); return 'OK'; },
  } as unknown as Redis;
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
});
