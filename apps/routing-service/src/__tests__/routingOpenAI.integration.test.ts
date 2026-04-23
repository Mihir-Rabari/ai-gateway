import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type Redis from 'ioredis';
import { RoutingService } from '../services/routingService.js';

function createRedisMock() {
  const state = new Map<string, string>();

  return {
    get: async (key: string) => state.get(key) ?? null,
    setex: async (key: string, _ttl: number, value: string) => {
      state.set(key, value);
      return 'OK';
    },
    eval: async (script: string, numKeys: number, key: string, ttl: string) => {
      const next = Number(state.get(key) ?? '0') + 1;
      state.set(key, String(next));
      return next;
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
  } as unknown as Redis;
}

describe('RoutingService OpenAI integration', () => {
  test('routes a real request through OpenAI when OPENAI_API_KEY is configured', { timeout: 60_000 }, async (t) => {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      t.skip('OPENAI_API_KEY is not configured');
      return;
    }

    // Avoid running network integration against placeholder/dummy values from sample env files.
    const looksPlaceholder =
      apiKey.includes('xxxx') ||
      apiKey.includes('xxxxx') ||
      apiKey.toLowerCase().includes('your-') ||
      apiKey.length < 40;
    if (looksPlaceholder) {
      t.skip('OPENAI_API_KEY appears to be a placeholder');
      return;
    }

    const publishedEvents: Array<{ topic: string; payload: Record<string, unknown> }> = [];
    const service = new RoutingService(
      async (topic, payload) => {
        publishedEvents.push({ topic, payload: payload as Record<string, unknown> });
      },
      createRedisMock(),
    );

    let result: Awaited<ReturnType<RoutingService['route']>>;
    try {
      result = await service.route({
        requestId: 'it-openai-real-call',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
        maxTokens: 16,
        temperature: 0,
      });
    } catch (err) {
      const asError = err as { code?: string; message?: string };
      if (asError.code === 'GATEWAY_002') {
        t.skip('OPENAI_API_KEY is configured but rejected by provider in this environment');
        return;
      }
      throw err;
    }

    assert.ok('output' in result);
    assert.ok(result.output.trim().length > 0);
    assert.equal(result.provider, 'openai');
    assert.ok(result.tokensTotal >= 0);
    assert.ok(publishedEvents.length > 0);

    const routingEvent = publishedEvents[0]?.payload;
    assert.ok(routingEvent);
    assert.ok(
      routingEvent?.['type'] === 'routing.selected' || routingEvent?.['type'] === 'routing.fallback',
    );
  });
});
