import { describe, test } from 'node:test';
import { RoutingService } from '../services/routingService.js';

function createRedisMock() {
  const state = new Map<string, string>();

  return {
    get: async (key: string) => state.get(key) ?? null,
    mget: async (keys: string[]) => keys.map((k) => state.get(k) ?? null),
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
    del: async (...keys: string[]) => {
      let deleted = 0;
      for (const key of keys) {
        if (state.delete(key)) deleted += 1;
      }
      return deleted;
    },
  } as any;
}

describe('RoutingService OpenAI integration', () => {
  test('is skipped since OpenAI has been removed as a provider', { timeout: 10_000 }, async (t) => {
    t.skip('All legacy providers (OpenAI, Anthropic, Google) have been removed');
  });
});
