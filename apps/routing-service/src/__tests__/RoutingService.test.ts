import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type Redis from 'ioredis';
import { RoutingService } from '../services/routingService.js';

function createRedisMock(initialState: Record<string, string> = {}) {
  const state = new Map(Object.entries(initialState));

  return {
    get: async (key: string) => state.get(key) ?? null,
    mget: async (keys: string[]) => {
      return keys.map((k) => state.get(k) ?? null);
    },
    setex: async (key: string, _ttl: number, value: string) => {
      state.set(key, value);
      return 'OK';
    },
    incr: async (key: string) => {
      const next = Number(state.get(key) ?? '0') + 1;
      state.set(key, String(next));
      return next;
    },
    expire: async () => 1,
    eval: async (_script: string, _numKeys: number, ...args: string[]) => {
      const key = args[0];
      if (key) {
        const next = Number(state.get(key) ?? '0') + 1;
        state.set(key, String(next));
        return next;
      }
      return 1;
    },
    del: async (...keys: string[]) => {
      let deleted = 0;
      for (const key of keys) {
        if (state.delete(key)) {
          deleted += 1;
        }
      }
      return deleted;
    },
  } as unknown as Redis;
}

describe('RoutingService', () => {
  test('throws ROUTING_FAILED when no providers are configured', async () => {
    const service = new RoutingService(
      async () => undefined,
      createRedisMock(),
      {},
    );

    await assert.rejects(
      () =>
        service.route({
          requestId: 'req-empty',
          model: 'any-model',
          messages: [{ role: 'user', content: 'hello' }],
        }),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_002',
    );
  });

  test('returns empty health when no providers configured', async () => {
    const service = new RoutingService(
      async () => undefined,
      createRedisMock(),
      {},
      { modelProvider: {}, fallbackMap: {} },
    );

    const providers = await service.getProvidersHealth();
    assert.equal(providers.length, 0);
  });
});
