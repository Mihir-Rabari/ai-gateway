import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validateModelConfig, type ModelConfig } from '../services/routingService.js';

describe('validateModelConfig', () => {
  test('strips unknown providers from the config', () => {
    const config: ModelConfig = {
      modelProvider: {
        'gpt-4o': 'openai' as any,
        'unknown-model': 'unknown-provider' as any,
      },
      fallbackMap: {
        'gpt-4o': 'gpt-3.5-turbo',
      },
    };

    const validated = validateModelConfig(config);

    assert.deepEqual(validated.modelProvider, {});
    // 'openai' is not a valid provider anymore, so both should be stripped
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
