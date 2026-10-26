import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RoutingService,
  validateModelConfig,
  buildModelConfigFromEnv,
  DEFAULT_MODEL_CONFIG,
  type ModelConfig,
} from '../services/routingService.js';
import { Errors } from '@ai-gateway/utils';
// Inline mock factories
function createRedisMock() {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => { store.set(key, value); return 'OK' as const; },
    setex: async (key: string, _ttl: number, value: string) => { store.set(key, value); return 'OK' as const; },
    del: async (...keys: string[]) => { let n = 0; keys.forEach(k => { if (store.delete(k)) n++; }); return n; },
    keys: async (pattern: string) => { const r = new RegExp(pattern.replace(/\*/g, '.*')); return [...store.keys()].filter(k => r.test(k)); },
    scan: async (_cursor: string, ...args: unknown[]) => {
      const matchIdx = args.indexOf('MATCH');
      const pattern = matchIdx >= 0 ? args[matchIdx + 1] as string : '*';
      const r = new RegExp(String(pattern).replace(/\*/g, '.*'));
      return ['0', [...store.keys()].filter(k => r.test(k))] as [string, string[]];
    },
    incr: async (key: string) => { const v = (parseInt(store.get(key) ?? '0') + 1).toString(); store.set(key, v); return parseInt(v); },
    expire: async () => 1,
    eval: async () => 1,
    quit: async () => 'OK',
  };
}
function createKafkaMock() {
  const messages: Array<{ topic: string; msg: any }> = [];
  return {
    producer: { connect: async () => {}, send: async (topic: string, msg: any) => { messages.push({ topic, msg }); } },
    consumer: { connect: async () => {}, subscribe: async () => {}, run: async () => {} },
    _messages: messages,
  };
}
function createFetchMock(options?: { routes: Record<string, () => any> }) {
  if (options?.routes) {
    return vi.fn(async (url: string, init?: RequestInit) => {
      for (const [route, handler] of Object.entries(options.routes)) {
        if (url.includes(route)) {
          return handler() as unknown as Response;
        }
      }
      return {
        ok: true, status: 200,
        json: async () => ({ choices: [{ message: { content: 'test response' } }] }),
        text: async () => JSON.stringify({ choices: [{ message: { content: 'test response' } }] }),
        headers: new Headers(),
      } as unknown as Response;
    });
  }
  return vi.fn(async (url: string, init?: RequestInit) => {
    return {
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: 'test response' } }] }),
      text: async () => JSON.stringify({ choices: [{ message: { content: 'test response' } }] }),
      headers: new Headers(),
    } as unknown as Response;
  });
}
import type Redis from 'ioredis';

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
}));

// ───────────────────────────────────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────────────────────────────────

const VALID_CONFIG: ModelConfig = {
  modelProvider: {
    'gpt-5.5-codex': 'codex',
    'gpt-5.4-codex': 'codex',
  },
  fallbackMap: {
    'gpt-5.5-codex': 'gpt-5.4-codex',
  },
};

const MOCK_CODEX_RESPONSE = {
  output_text: 'Hello from Codex',
  usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
};

// ───────────────────────────────────────────────────────────────────────────
// validateModelConfig tests
// ───────────────────────────────────────────────────────────────────────────

describe('validateModelConfig', () => {
  it('keeps entries with valid provider names', () => {
    const config: ModelConfig = {
      modelProvider: { 'gpt-5.5-codex': 'codex' },
      fallbackMap: { 'gpt-5.5-codex': 'gpt-5.4-codex' },
    };
    const result = validateModelConfig(config);
    expect(result.modelProvider).toEqual({ 'gpt-5.5-codex': 'codex' });
    expect(result.fallbackMap).toEqual({ 'gpt-5.5-codex': 'gpt-5.4-codex' });
  });

  it('strips entries with unknown provider names', () => {
    const config: ModelConfig = {
      modelProvider: { 'gpt-x': 'openai', 'gpt-5.5-codex': 'codex' },
      fallbackMap: {},
    };
    const result = validateModelConfig(config);
    expect(result.modelProvider).not.toHaveProperty('gpt-x');
    expect(result.modelProvider).toHaveProperty('gpt-5.5-codex');
  });

  it('returns empty modelProvider when all providers are unknown', () => {
    const config: ModelConfig = {
      modelProvider: { 'a': 'unknown', 'b': 'invalid' },
      fallbackMap: {},
    };
    const result = validateModelConfig(config);
    expect(Object.keys(result.modelProvider)).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// buildModelConfigFromEnv tests
// ───────────────────────────────────────────────────────────────────────────

describe('buildModelConfigFromEnv', () => {
  afterEach(() => {
    delete process.env['MODEL_PROVIDER_JSON'];
    delete process.env['MODEL_FALLBACK_JSON'];
  });

  it('returns default config when no env vars are set', () => {
    delete process.env['MODEL_PROVIDER_JSON'];
    delete process.env['MODEL_FALLBACK_JSON'];
    const config = buildModelConfigFromEnv();
    expect(config.modelProvider).toEqual(DEFAULT_MODEL_CONFIG.modelProvider);
    expect(config.fallbackMap).toEqual(DEFAULT_MODEL_CONFIG.fallbackMap);
  });

  it('merges MODEL_PROVIDER_JSON overrides on top of defaults', () => {
    process.env['MODEL_PROVIDER_JSON'] = JSON.stringify({ 'custom-model': 'codex' });
    const config = buildModelConfigFromEnv();
    expect(config.modelProvider['custom-model']).toBe('codex');
    // Defaults should still be present
    expect(config.modelProvider['gpt-5.5-codex']).toBe('codex');
  });

  it('falls back to defaults when MODEL_PROVIDER_JSON is invalid JSON', () => {
    process.env['MODEL_PROVIDER_JSON'] = 'not-json{';
    const config = buildModelConfigFromEnv();
    expect(config.modelProvider).toEqual(DEFAULT_MODEL_CONFIG.modelProvider);
  });

  it('merges MODEL_FALLBACK_JSON overrides', () => {
    process.env['MODEL_FALLBACK_JSON'] = JSON.stringify({ 'gpt-5.5-codex': 'gpt-5.3-codex' });
    const config = buildModelConfigFromEnv();
    expect(config.fallbackMap['gpt-5.5-codex']).toBe('gpt-5.3-codex');
  });
});

