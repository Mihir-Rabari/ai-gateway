import { createLogger, Errors, generateId } from '@ai-gateway/utils';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { Message, RoutingEvent } from '@ai-gateway/types';
import type Redis from 'ioredis';

const logger = createLogger('routing-service');

const REDIS_MODEL_CONFIG_KEY = 'model:config';

interface RouteResult {
  output: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  model: string;
  provider: string;
}

interface RoutingServiceDeps {
  /** URL of the auth-service for Codex token retrieval */
  authServiceUrl?: string;
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
  modelProvider: Record<string, string>;
  /** Maps model name → fallback model name */
  fallbackMap: Record<string, string>;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelProvider: {
    'gpt-5.6-sol-codex': 'codex',
    'gpt-5.6-terra-codex': 'codex',
    'gpt-5.6-luna-codex': 'codex',
    'gpt-5.5-codex': 'codex',
    'gpt-5.5-codex-fast': 'codex',
    'gpt-5.4-codex': 'codex',
    'gpt-5.3-codex': 'codex',
    'gpt-5.2-codex': 'codex',
    'gpt-5.1-codex': 'codex',
    'gpt-image-2-codex': 'codex',
  },
  fallbackMap: {
    'gpt-5.6-sol-codex': 'gpt-5.5-codex',
    'gpt-5.6-terra-codex': 'gpt-5.5-codex-fast',
    'gpt-5.6-luna-codex': 'gpt-5.5-codex-fast',
    'gpt-5.5-codex': 'gpt-5.4-codex',
    'gpt-5.5-codex-fast': 'gpt-5.4-codex',
    'gpt-5.4-codex': 'gpt-5.3-codex',
    'gpt-5.3-codex': 'gpt-5.2-codex',
  },
};

const VALID_PROVIDERS = new Set<string>(['codex']);

/**
 * Validate that all provider values in a ModelConfig are known ProviderName
 * values. Strips out unknown entries and returns the cleaned config.
 */
export function validateModelConfig(config: ModelConfig): ModelConfig {
  const modelProvider: Record<string, string> = {};
  for (const [model, provider] of Object.entries(config.modelProvider)) {
    if (VALID_PROVIDERS.has(provider)) {
      modelProvider[model] = provider;
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
  private readonly FAILURE_THRESHOLD = 5;
  private modelConfig: ModelConfig;

  private readonly httpFetch = globalThis.fetch.bind(globalThis);

  constructor(
    private readonly kafkaPublish: (topic: string, msg: object) => Promise<void>,
    private readonly redis: Redis,
    private readonly deps: RoutingServiceDeps = {},
    modelConfig?: ModelConfig,
  ) {
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
    /** Required for Codex provider — the user's ID for token retrieval */
    userId?: string;
  }): Promise<RouteResult | AsyncIterable<string>> {
    const { modelProvider, fallbackMap } = this.modelConfig;

    const provider = modelProvider[data.model];
    if (!provider) throw Errors.ROUTING_FAILED();

    const isPrimaryHealthy = await this.isHealthy(provider);

    if (isPrimaryHealthy) {
      try {
        const startedAt = Date.now();
        const result = await this.callProvider(provider, data.model, data.messages, data.maxTokens, data.temperature, data.stream, data.userId);
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
      const result = await this.callProvider(fallbackProvider, fallbackModel, data.messages, data.maxTokens, data.temperature, data.stream, data.userId);
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

  private async isHealthy(provider: string): Promise<boolean> {
    const result = await this.redis.get(`provider:unhealthy:${provider}`);
    return result === null;
  }

  private async markUnhealthy(provider: string): Promise<void> {
    await this.redis.setex(`provider:unhealthy:${provider}`, 60, '1');
  }

  private async recordFailure(provider: string): Promise<void> {
    const key = `provider:failures:${provider}`;
    const LUA_SCRIPT = `
      local key = KEYS[1]
      local ttl = tonumber(ARGV[1])
      local count = redis.call('INCR', key)
      redis.call('EXPIRE', key, ttl)
      return count
    `;
    const failures = await this.redis.eval(LUA_SCRIPT, 1, key, '300') as number; // reset after 5 minutes
    if (failures >= this.FAILURE_THRESHOLD) {
      await this.markUnhealthy(provider);
      logger.warn({ provider, failures }, 'Provider circuit breaker tripped');
    }
  }

  private async recordSuccess(provider: string): Promise<void> {
    await this.redis.del(`provider:failures:${provider}`);
  }

  async getProvidersHealth() {
    const { modelProvider } = this.modelConfig;
    const providers = [...new Set(Object.values(modelProvider))];

    if (providers.length === 0) return [];

    // ⚡ Bolt: Batch Redis queries to avoid N+1 queries.
    // Instead of querying `isHealthy` and `failures` individually per provider in a Promise.all,
    // we use `mget` to fetch all statuses in a single round trip, significantly reducing latency.
    const keysToFetch = providers.flatMap((p) => [
      `provider:unhealthy:${p}`,
      `provider:failures:${p}`,
    ]);

    const results = await this.redis.mget(keysToFetch);

    // ⚡ Bolt: Pre-compute models by provider to avoid O(N * P) array allocations in the .map loop
    const modelsByProvider: Record<string, string[]> = {};
    for (const [model, prov] of Object.entries(modelProvider)) {
      if (!modelsByProvider[prov]) modelsByProvider[prov] = [];
      modelsByProvider[prov].push(model);
    }

    return providers.map((p, index) => {
      const unhealthyResult = results[index * 2];
      const failureResult = results[index * 2 + 1];
      return {
        name: p,
        models: modelsByProvider[p] ?? [],
        healthy: unhealthyResult === null,
        failureCount: Number(failureResult ?? '0'),
      };
    });
  }

  private async callProvider(
    provider: string,
    model: string,
    messages: Message[],
    maxTokens = 1024,
    temperature = 0.7,
    stream = false,
    userId?: string,
  ): Promise<RouteResult | AsyncIterable<string>> {
    switch (provider) {
      case 'codex': {
        if (!userId) throw Errors.ROUTING_FAILED();
        return this.callCodex(userId, model, messages, maxTokens, temperature, stream);
      }
      default:
        throw Errors.ROUTING_FAILED();
    }
  }

  /**
   * Call the Codex API via the auth-service internal endpoint.
   * The auth-service manages per-user OAuth token retrieval/refresh and
   * proxies the request to chatgpt.com/backend-api/codex/responses.
   */
  private async callCodex(
    userId: string,
    model: string,
    messages: Message[],
    maxTokens: number,
    temperature: number,
    stream: boolean,
  ): Promise<RouteResult | AsyncIterable<string>> {
    const authServiceUrl = this.deps.authServiceUrl ?? 'http://localhost:3003';

    // Get the user's access token from auth-service
    const tokenRes = await this.httpFetch(
      `${authServiceUrl}/internal/auth/codex/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env['INTERNAL_SERVICE_SECRET'] ?? '',
        },
        body: JSON.stringify({ userId }),
      },
    );

    if (!tokenRes.ok) {
      const body = await tokenRes.json().catch(() => ({})) as { error?: { message?: string } };
      logger.warn({ userId, status: tokenRes.status }, 'Failed to get Codex token from auth-service');
      throw tokenRes.status === 401
        ? Errors.ROUTING_FAILED()
        : Errors.ROUTING_FAILED();
    }

    const tokenData = (await tokenRes.json()) as {
      success: boolean;
      data?: { accessToken: string };
    };
    if (!tokenData.success || !tokenData.data?.accessToken) {
      throw Errors.ROUTING_FAILED();
    }

    const accessToken = tokenData.data.accessToken;
    const codexBaseUrl = process.env['CODEX_API_BASE_URL'] ?? 'https://chatgpt.com/backend-api/codex';

    const body: Record<string, unknown> = {
      model,
      input: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: maxTokens,
      temperature,
    };

    if (stream) {
      body.stream = true;
      return this.streamCodexResponse(accessToken, codexBaseUrl, body);
    }

    const res = await this.httpFetch(`${codexBaseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'OpenAI-Beta': 'responses=v1',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: text.slice(0, 200) }, 'Codex API call failed');
      if (res.status === 401) throw Errors.ROUTING_FAILED();
      throw Errors.ROUTING_FAILED();
    }

    const data = (await res.json()) as {
      output_text?: string;
      usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
    };

    return {
      output: data.output_text ?? '',
      tokensInput: data.usage?.input_tokens ?? 0,
      tokensOutput: data.usage?.output_tokens ?? 0,
      tokensTotal: data.usage?.total_tokens ?? 0,
      model,
      provider: 'codex',
    };
  }

  private async *streamCodexResponse(
    accessToken: string,
    codexBaseUrl: string,
    body: Record<string, unknown>,
  ): AsyncIterable<string> {
    const res = await this.httpFetch(`${codexBaseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'OpenAI-Beta': 'responses=v1',
      },
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!res.ok || !res.body) {
      throw Errors.ROUTING_FAILED();
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          yield `${trimmed}\n\n`;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private publishRoutingEvent(
    type: RoutingEvent['type'],
    requestId: string,
    model: string,
    provider: string,
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
