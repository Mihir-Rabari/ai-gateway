import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RoutingService,
  validateModelConfig,
  buildModelConfigFromEnv,
  DEFAULT_MODEL_CONFIG,
  type ModelConfig,
} from '../services/routingService.js';
import { Errors } from '@ai-gateway/utils';
import { createRedisMock, createKafkaMock, createFetchMock } from '../../../test-setup.js';
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

