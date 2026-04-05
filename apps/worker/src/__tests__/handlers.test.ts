import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { processAuthEvent, processUsageEvent } from '../handlers.js';
import type { AuthEvent, UsageEvent } from '@ai-gateway/types';

describe('worker handlers', () => {
  test('processUsageEvent credits the developer wallet for completed requests', async () => {
    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    const logs: Array<{ obj: object; msg: string }> = [];

    const event: UsageEvent = {
      eventId: 'evt-1',
      topic: 'usage.events',
      type: 'usage.request.completed',
      requestId: 'req-1',
      userId: 'user-1',
      appId: 'app-1',
      model: 'gpt-4o',
      provider: 'openai',
      tokensInput: 10,
      tokensOutput: 20,
      tokensTotal: 30,
      creditsDeducted: 25,
      latencyMs: 100,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    await processUsageEvent(
      { query: async (sql, params) => { queries.push({ sql, params }); } },
      event,
      { info: (obj, msg) => { logs.push({ obj, msg }); } },
      () => 'wallet-txn-1',
    );

    assert.equal(queries.length, 1);
    assert.equal((queries[0]?.params ?? [])[0], 'wallet-txn-1');
    assert.equal((queries[0]?.params ?? [])[3], 5);
    assert.equal(logs.length, 1);
  });

  test('processAuthEvent stores normalized user audit events', async () => {
    const queries: Array<{ sql: string; params?: unknown[] }> = [];
    const event: AuthEvent = {
      eventId: 'evt-2',
      topic: 'auth.events',
      type: 'user.login',
      userId: 'user-42',
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    await processAuthEvent(
      { query: async (sql, params) => { queries.push({ sql, params }); } },
      event,
      { info: () => undefined },
      () => 'user-event-1',
    );

    assert.equal(queries.length, 1);
    assert.equal((queries[0]?.params ?? [])[0], 'user-event-1');
    assert.equal((queries[0]?.params ?? [])[1], 'user-42');
    assert.equal((queries[0]?.params ?? [])[2], 'login');
  });
});
