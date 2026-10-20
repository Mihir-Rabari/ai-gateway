import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
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
    assert.deepEqual(result.modelProvider, { 'gpt-5.5-codex': 'codex' });
    assert.deepEqual(result.fallbackMap, { 'gpt-5.5-codex': 'gpt-5.4-codex' });
  });

  it('strips entries with unknown provider names', () => {
    const config: ModelConfig = {
      modelProvider: { 'gpt-x': 'openai', 'gpt-5.5-codex': 'codex' },
      fallbackMap: {},
    };
    const result = validateModelConfig(config);
    assert.equal(Reflect.has(result.modelProvider, 'gpt-x'), false);
    assert.equal(Reflect.has(result.modelProvider, 'gpt-5.5-codex'), true);
  });

  it('returns empty modelProvider when all providers are unknown', () => {
    const config: ModelConfig = {
      modelProvider: { 'a': 'unknown', 'b': 'invalid' },
      fallbackMap: {},
    };
    const result = validateModelConfig(config);
    assert.equal(Object.keys(result.modelProvider).length, 0);
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
    assert.deepEqual(config.modelProvider, DEFAULT_MODEL_CONFIG.modelProvider);
    assert.deepEqual(config.fallbackMap, DEFAULT_MODEL_CONFIG.fallbackMap);
  });

  it('merges MODEL_PROVIDER_JSON overrides on top of defaults', () => {
    process.env['MODEL_PROVIDER_JSON'] = JSON.stringify({ 'custom-model': 'codex' });
    const config = buildModelConfigFromEnv();
    assert.equal(config.modelProvider['custom-model'], 'codex');
    // Defaults should still be present
    assert.equal(config.modelProvider['gpt-5.5-codex'], 'codex');
  });

  it('falls back to defaults when MODEL_PROVIDER_JSON is invalid JSON', () => {
    process.env['MODEL_PROVIDER_JSON'] = 'not-json{';
    const config = buildModelConfigFromEnv();
    assert.deepEqual(config.modelProvider, DEFAULT_MODEL_CONFIG.modelProvider);
  });

  it('merges MODEL_FALLBACK_JSON overrides', () => {
    process.env['MODEL_FALLBACK_JSON'] = JSON.stringify({ 'gpt-5.5-codex': 'gpt-5.3-codex' });
    const config = buildModelConfigFromEnv();
    assert.equal(config.fallbackMap['gpt-5.5-codex'], 'gpt-5.3-codex');
  });
});

