import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger, Errors, generateId } from '@ai-gateway/utils';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { Message, RoutingEvent, ProviderName } from '@ai-gateway/types';
import type Redis from 'ioredis';

const logger = createLogger('routing-service');

const REDIS_MODEL_CONFIG_KEY = 'model:config';

interface RouteResult {
  output: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  model: string;
  provider: ProviderName;
}

interface OpenAiClientLike {
  chat: {
    completions: {
      create: (...args: any[]) => Promise<any>;
    };
  };
}

interface AnthropicClientLike {
  messages: {
    create: (...args: any[]) => Promise<any>;
  };
}

interface GoogleClientLike {
  getGenerativeModel: (...args: any[]) => {
    generateContent: (...innerArgs: any[]) => Promise<any>;
    generateContentStream: (...innerArgs: any[]) => Promise<any>;
  };
}

interface RoutingServiceDeps {
  openaiClient?: OpenAiClientLike;
  anthropicClient?: AnthropicClientLike;
  googleClient?: GoogleClientLike;
}

// ─────────────────────────────────────────
// Model Configuration
//
// Default model-to-provider and fallback maps. These defaults can be
// overridden at startup via MODEL_PROVIDER_JSON / MODEL_FALLBACK_JSON
// environment variables, or at runtime by saving a new config to Redis
// (see RoutingService.saveModelConfig / loadModelConfig).
// ─────────────────────────────────────────

export interface ModelConfig {
  /** Maps model name → provider name */
  modelProvider: Record<string, ProviderName>;
  /** Maps model name → fallback model name */
  fallbackMap: Record<string, string>;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelProvider: {
    'gpt-4o': 'openai',
    'gpt-4-turbo': 'openai',
    'gpt-3.5-turbo': 'openai',
    'claude-3-5-sonnet-20241022': 'anthropic',
    'claude-3-haiku-20240307': 'anthropic',
    'gemini-2.5-pro': 'google',
    'gemini-2.5-flash': 'google',
  },
  fallbackMap: {
    'gpt-4o': 'gpt-3.5-turbo',
    'gpt-4-turbo': 'gpt-3.5-turbo',
    'claude-3-5-sonnet-20241022': 'claude-3-haiku-20240307',
    'gemini-2.5-pro': 'gemini-2.5-flash',
  },
};

const VALID_PROVIDERS = new Set<string>(['openai', 'anthropic', 'google']);

/**
 * Validate that all provider values in a ModelConfig are known ProviderName
 * values. Strips out unknown entries and returns the cleaned config.
 */
export function validateModelConfig(config: ModelConfig): ModelConfig {
  const modelProvider: Record<string, ProviderName> = {};
  for (const [model, provider] of Object.entries(config.modelProvider)) {
    if (VALID_PROVIDERS.has(provider)) {
      modelProvider[model] = provider as ProviderName;
    } else {
      logger.warn({ model, provider }, 'Unknown provider in model config — skipping entry');
    }
  }
  return { modelProvider, fallbackMap: config.fallbackMap };
}

/**
 * Build a ModelConfig by merging the hardcoded defaults with any
 * JSON overrides supplied via environment variables.
 *
 * MODEL_PROVIDER_JSON – JSON object mapping model name → provider name
 * MODEL_FALLBACK_JSON  – JSON object mapping model name → fallback model name
 */
export function buildModelConfigFromEnv(): ModelConfig {
  const providerJson = process.env['MODEL_PROVIDER_JSON'];
  const fallbackJson = process.env['MODEL_FALLBACK_JSON'];

  let modelProvider = { ...DEFAULT_MODEL_CONFIG.modelProvider };
  let fallbackMap = { ...DEFAULT_MODEL_CONFIG.fallbackMap };

  if (providerJson) {
    try {
      modelProvider = { ...modelProvider, ...JSON.parse(providerJson) };
    } catch {
      logger.warn('MODEL_PROVIDER_JSON is not valid JSON — using defaults');
    }
  }

  if (fallbackJson) {
    try {
      fallbackMap = { ...fallbackMap, ...JSON.parse(fallbackJson) };
    } catch {
      logger.warn('MODEL_FALLBACK_JSON is not valid JSON — using defaults');
    }
  }

  return validateModelConfig({ modelProvider, fallbackMap });
}

export class RoutingService {
  private readonly openai: OpenAiClientLike;
  private readonly anthropic: AnthropicClientLike;
  private readonly genAI: GoogleClientLike;
  private readonly FAILURE_THRESHOLD = 5;
  private modelConfig: ModelConfig;

  constructor(
    private readonly kafkaPublish: (topic: string, msg: object) => Promise<void>,
    private readonly redis: Redis,
    deps: RoutingServiceDeps = {},
    modelConfig?: ModelConfig,
  ) {
    this.openai = deps.openaiClient ?? new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] ?? '' });
    this.anthropic = deps.anthropicClient ?? new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' });
    this.genAI = deps.googleClient ?? new GoogleGenerativeAI(process.env['GOOGLE_AI_API_KEY'] ?? '');
    this.modelConfig = modelConfig ?? buildModelConfigFromEnv();
  }

  // ─── Model config persistence ──────────────────────────────────────

  /**
   * Load model config from Redis. Returns null when no config has been
   * stored yet (callers should fall back to buildModelConfigFromEnv()).
   */
  static async loadModelConfig(redis: Redis): Promise<ModelConfig | null> {
    const raw = await redis.get(REDIS_MODEL_CONFIG_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as ModelConfig;
      return validateModelConfig(parsed);
    } catch {
      logger.warn('Stored model config in Redis is not valid JSON — ignoring');
      return null;
    }
  }

  /**
   * Persist the given model config to Redis so it survives service restarts
   * and is shared across routing-service replicas. Can be called as a static
   * method so callers don't need to instantiate a full RoutingService.
   */
  static async saveModelConfigToRedis(redis: Redis, config: ModelConfig): Promise<void> {
    const validated = validateModelConfig(config);
    await redis.set(REDIS_MODEL_CONFIG_KEY, JSON.stringify(validated));
    logger.info('Model config updated and saved to Redis');
  }

  /**
   * Persist the given model config to Redis and update this instance's config.
   * @deprecated Prefer the static RoutingService.saveModelConfigToRedis when a
   * full service instance is not required.
   */
  async saveModelConfig(config: ModelConfig): Promise<void> {
    const validated = validateModelConfig(config);
    await RoutingService.saveModelConfigToRedis(this.redis, validated);
    this.modelConfig = validated;
  }

  /** Return the currently active model configuration. */
  getModelConfig(): ModelConfig {
    return this.modelConfig;
  }

  async route(data: {
    requestId: string;
    model: string;
    messages: Message[];
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<RouteResult | AsyncIterable<string>> {
    const { modelProvider, fallbackMap } = this.modelConfig;

    const provider = modelProvider[data.model];
    if (!provider) throw Errors.ROUTING_FAILED();

    const isPrimaryHealthy = await this.isHealthy(provider);

    if (isPrimaryHealthy) {
      try {
        const startedAt = Date.now();
        const result = await this.callProvider(provider, data.model, data.messages, data.maxTokens, data.temperature, data.stream);
        const latencyMs = Date.now() - startedAt;
        void this.publishRoutingEvent('routing.selected', data.requestId, data.model, provider, undefined, latencyMs);
        await this.recordSuccess(provider);
        return result;
      } catch (err) {
        logger.warn({ model: data.model, err }, 'Primary provider failed, trying fallback');
        await this.recordFailure(provider);
      }
    } else {
      logger.warn({ model: data.model, provider }, 'Primary provider unhealthy, skipping to fallback');
    }

    const fallbackModel = fallbackMap[data.model];
    if (fallbackModel === undefined) throw Errors.ROUTING_FAILED();

    const fallbackProvider = modelProvider[fallbackModel];
    if (fallbackProvider === undefined) throw Errors.ROUTING_FAILED();

    try {
      const startedAt = Date.now();
      const result = await this.callProvider(fallbackProvider, fallbackModel, data.messages, data.maxTokens, data.temperature, data.stream);
      const latencyMs = Date.now() - startedAt;
      void this.publishRoutingEvent(
        'routing.fallback',
        data.requestId,
        fallbackModel,
        fallbackProvider,
        `Primary ${data.model} failed or unhealthy`,
        latencyMs,
      );
      await this.recordSuccess(fallbackProvider);
      return result;
    } catch (fallbackErr) {
      await this.recordFailure(fallbackProvider);
      throw Errors.ROUTING_FAILED();
    }
  }

  private async isHealthy(provider: ProviderName): Promise<boolean> {
    const result = await this.redis.get(`provider:unhealthy:${provider}`);
    return result === null;
  }

  private async markUnhealthy(provider: ProviderName): Promise<void> {
    await this.redis.setex(`provider:unhealthy:${provider}`, 60, '1');
  }

  private async recordFailure(provider: ProviderName): Promise<void> {
    const key = `provider:failures:${provider}`;
    const failures = await this.redis.incr(key);
    await this.redis.expire(key, 300); // reset after 5 minutes
    if (failures >= this.FAILURE_THRESHOLD) {
      await this.markUnhealthy(provider);
      logger.warn({ provider, failures }, 'Provider circuit breaker tripped');
    }
  }

  private async recordSuccess(provider: ProviderName): Promise<void> {
    await this.redis.del(`provider:failures:${provider}`);
  }

  async getProvidersHealth() {
    const { modelProvider } = this.modelConfig;
    // modelProvider values are guaranteed to be valid ProviderName entries
    // because validateModelConfig filters out any unknown providers.
    const providers = [...new Set(Object.values(modelProvider))];

    // Batch redis lookups to avoid N+1 queries.
    // We look up `provider:unhealthy:<p>` and `provider:failures:<p>` for each provider.
    const keys = providers.flatMap((p) => [
      `provider:unhealthy:${p}`,
      `provider:failures:${p}`,
    ]);

    const values = keys.length > 0 ? await this.redis.mget(keys) : [];

    return providers.map((p, index) => {
      // Each provider takes 2 keys in the array
      const unhealthyValue = values[index * 2];
      const failuresValue = values[index * 2 + 1];

      return {
        name: p,
        models: Object.keys(modelProvider).filter((model) => modelProvider[model] === p),
        healthy: unhealthyValue === null,
        failureCount: Number(failuresValue ?? '0'),
      };
    });
  }

  private callProvider(
    provider: ProviderName,
    model: string,
    messages: Message[],
    maxTokens = 1024,
    temperature = 0.7,
    stream = false,
  ): Promise<RouteResult | AsyncIterable<string>> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(model, messages, maxTokens, temperature, stream);
      case 'anthropic':
        return this.callAnthropic(model, messages, maxTokens, temperature, stream);
      case 'google':
        return this.callGemini(model, messages, maxTokens, temperature, stream);
      default:
        throw Errors.ROUTING_FAILED();
    }
  }

  private async callGemini(
    model: string,
    messages: Message[],
    maxTokens: number,
    temperature: number,
    stream: boolean,
  ): Promise<RouteResult | AsyncIterable<string>> {
    const geminiModel = this.genAI.getGenerativeModel({ model });

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');

    if (stream) {
      const resultStream = await geminiModel.generateContentStream({
        contents,
        ...(systemInstruction ? { systemInstruction } : {}),
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      });

      return (async function* () {
        for await (const chunk of resultStream.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            yield `data: ${JSON.stringify({ output: chunkText })}\n\n`;
          }
        }
        const finalResponse = await resultStream.response;
        const usage = finalResponse.usageMetadata;
        yield `data: ${JSON.stringify({ usage: { tokensInput: usage?.promptTokenCount ?? 0, tokensOutput: usage?.candidatesTokenCount ?? 0, tokensTotal: usage?.totalTokenCount ?? 0 }, provider: 'google' })}\n\n`;
        yield `data: [DONE]\n\n`;
      })();
    }

    const response = await geminiModel.generateContent({
      contents,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    });

    const text = response.response.text();
    const usage = response.response.usageMetadata;

    return {
      output: text,
      tokensInput: usage?.promptTokenCount ?? 0,
      tokensOutput: usage?.candidatesTokenCount ?? 0,
      tokensTotal: usage?.totalTokenCount ?? 0,
      model,
      provider: 'google',
    };
  }

  private async callOpenAI(
    model: string,
    messages: Message[],
    maxTokens: number,
    temperature: number,
    stream: boolean,
  ): Promise<RouteResult | AsyncIterable<string>> {
    if (stream) {
      const responseStream = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        stream_options: { include_usage: true },
      });

      return (async function* () {
        let tokensInput = 0;
        let tokensOutput = 0;
        let tokensTotal = 0;
        for await (const chunk of responseStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            yield `data: ${JSON.stringify({ output: content })}\n\n`;
          }
          if (chunk.usage) {
            tokensInput = chunk.usage.prompt_tokens ?? 0;
            tokensOutput = chunk.usage.completion_tokens ?? 0;
            tokensTotal = chunk.usage.total_tokens ?? 0;
          }
        }
        yield `data: ${JSON.stringify({ usage: { tokensInput, tokensOutput, tokensTotal }, provider: 'openai' })}\n\n`;
        yield `data: [DONE]\n\n`;
      })();
    }

    const response = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    const choice = response.choices[0];
    if (!choice?.message.content) throw Errors.PROVIDER_ERROR('Empty response from OpenAI');

    return {
      output: choice.message.content,
      tokensInput: response.usage?.prompt_tokens ?? 0,
      tokensOutput: response.usage?.completion_tokens ?? 0,
      tokensTotal: response.usage?.total_tokens ?? 0,
      model,
      provider: 'openai',
    };
  }

  private async callAnthropic(
    model: string,
    messages: Message[],
    maxTokens: number,
    temperature: number,
    stream: boolean,
  ): Promise<RouteResult | AsyncIterable<string>> {
    const systemMessages = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');

    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    if (stream) {
      const responseStream = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemMessages ? { system: systemMessages } : {}),
        messages: conversationMessages,
        stream: true,
      });

      return (async function* () {
        let tokensInput = 0;
        let tokensOutput = 0;
        for await (const chunk of responseStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            yield `data: ${JSON.stringify({ output: chunk.delta.text })}\n\n`;
          }
          if (chunk.type === 'message_start' && chunk.message?.usage) {
            tokensInput = chunk.message.usage.input_tokens ?? 0;
            tokensOutput = chunk.message.usage.output_tokens ?? 0;
          }
          if (chunk.type === 'message_delta' && chunk.usage) {
            tokensOutput = chunk.usage.output_tokens ?? tokensOutput;
          }
        }
        const tokensTotal = tokensInput + tokensOutput;
        yield `data: ${JSON.stringify({ usage: { tokensInput, tokensOutput, tokensTotal }, provider: 'anthropic' })}\n\n`;
        yield `data: [DONE]\n\n`;
      })();
    }

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemMessages ? { system: systemMessages } : {}),
      messages: conversationMessages,
    });

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw Errors.PROVIDER_ERROR('Empty response from Anthropic');

    return {
      output: textBlock.text,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      tokensTotal: response.usage.input_tokens + response.usage.output_tokens,
      model,
      provider: 'anthropic',
    };
  }

  private publishRoutingEvent(
    type: RoutingEvent['type'],
    requestId: string,
    model: string,
    provider: ProviderName,
    reason?: string,
    latencyMs?: number,
  ): Promise<void> {
    const event: RoutingEvent = {
      eventId: generateId(),
      topic: 'routing.events',
      type,
      requestId,
      model,
      provider,
      latencyMs,
      reason,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    return this.kafkaPublish(KAFKA_TOPICS.ROUTING, event);
  }
}
