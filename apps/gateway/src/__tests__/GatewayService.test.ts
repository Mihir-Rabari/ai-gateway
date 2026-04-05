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
  return {
    incr: async () => 1,
    expire: async () => 1,
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
});
