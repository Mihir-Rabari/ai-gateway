import test from 'node:test';
import assert from 'node:assert/strict';
import { UsageBatchBuffer, toRequestLogRow } from '../services/usageBatch.js';
import type { UsageEvent } from '@ai-gateway/types';

const sampleEvent = (requestId: string): UsageEvent => ({
  eventId: `evt_${requestId}`,
  topic: 'usage.events',
  version: '1.0',
  timestamp: new Date('2026-04-05T10:00:00.000Z').toISOString(),
  type: 'usage.request.completed',
  requestId,
  userId: 'user_1',
  appId: 'app_1',
  model: 'gpt-4o',
  provider: 'openai',
  tokensInput: 100,
  tokensOutput: 200,
  tokensTotal: 300,
  creditsDeducted: 3,
  latencyMs: 1200,
});

test('toRequestLogRow maps usage events for ClickHouse insert', () => {
  const row = toRequestLogRow(sampleEvent('req_1'));
  assert.equal(row.request_id, 'req_1');
  assert.equal(row.success, 1);
  assert.equal(row.error_code, null);
  assert.equal(row.tokens_total, 300);
});

test('UsageBatchBuffer only flushes when batch size is reached', () => {
  const buffer = new UsageBatchBuffer(2);
  const first = buffer.push(sampleEvent('req_1'));
  assert.equal(first, null);
  assert.equal(buffer.size(), 1);

  const second = buffer.push(sampleEvent('req_2'));
  assert.ok(Array.isArray(second));
  assert.equal(second.length, 2);
  assert.equal(buffer.size(), 0);
});

test('UsageBatchBuffer drain returns all queued events and resets buffer', () => {
  const buffer = new UsageBatchBuffer(100);
  buffer.push(sampleEvent('req_1'));
  buffer.push(sampleEvent('req_2'));

  const drained = buffer.drain();
  assert.equal(drained.length, 2);
  assert.equal(buffer.size(), 0);
});
