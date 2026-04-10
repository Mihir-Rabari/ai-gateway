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

function createRedisMock() {
  const store = new Map<string, string>();
  return {
    incr: async (key: string) => {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    },
    expire: async () => 1,
    get: async (key: string) => store.get(key) ?? null,
    setex: async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK' as const;
    },
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

    // First request: cache miss → DB queried once
    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-cache-test',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'first request should hit the DB');

    // Second request with same appId: cache hit → no additional DB query
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

    // First request: cache miss → DB queried once
    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-jwt-cache',
      appJwt: fakeAppJwt,
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'first JWT request should hit the DB');

    // Second request: cache hit → no additional DB query
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

    // First request (no API key, no JWT): cache miss → DB queried once
    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-active-cache',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'first active-check request should hit the DB');

    // Second request: cache hit → no additional DB query
    await makeService().processRequest({
      token: 'access-token',
      appId: 'app-active-cache',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(queryCount, 1, 'second active-check request should be served from cache without hitting DB');
  });
});
