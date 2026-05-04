import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateModelConfig, type ModelConfig } from '../services/routingService.js';

describe('validateModelConfig', () => {
  test('strips unknown providers from the config', () => {
    const config: ModelConfig = {
      modelProvider: {
        'gpt-4o': 'openai',
        'unknown-model': 'unknown-provider' as any,
      },
      fallbackMap: {
        'gpt-4o': 'gpt-3.5-turbo',
      },
    };

    const validated = validateModelConfig(config);

    assert.deepEqual(validated.modelProvider, {
      'gpt-4o': 'openai',
    });
    assert.deepEqual(validated.fallbackMap, config.fallbackMap);
  });

  test('keeps valid providers in the config', () => {
    const config: ModelConfig = {
      modelProvider: {
        'gpt-4o': 'openai',
        'claude-3': 'anthropic',
        'gemini-pro': 'google',
      },
      fallbackMap: {},
    };

    const validated = validateModelConfig(config);

    assert.deepEqual(validated.modelProvider, config.modelProvider);
  });

  test('preserves the fallback map', () => {
    const config: ModelConfig = {
      modelProvider: {
        'gpt-4o': 'openai',
      },
      fallbackMap: {
        'gpt-4o': 'gpt-3.5-turbo',
        'other': 'another',
      },
    };

    const validated = validateModelConfig(config);

    assert.deepEqual(validated.fallbackMap, config.fallbackMap);
  });

  test('handles empty modelProvider config', () => {
    const config: ModelConfig = {
      modelProvider: {},
      fallbackMap: {},
    };

    const validated = validateModelConfig(config);

    assert.deepEqual(validated.modelProvider, {});
    assert.deepEqual(validated.fallbackMap, {});
  });
});
