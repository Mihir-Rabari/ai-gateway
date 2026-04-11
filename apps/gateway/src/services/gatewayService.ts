import { fetch } from 'undici';
import { createHash } from 'crypto';
import {
  generateId, Errors, calculateCredits, createLogger, GatewayError, withRetry,
} from '@ai-gateway/utils';
import { KAFKA_TOPICS, FIRST_PARTY_APP_IDS } from '@ai-gateway/config';
import type { GatewayRequest, GatewayResponse, UsageEvent } from '@ai-gateway/types';
import type Redis from 'ioredis';
import { CircuitBreaker } from './circuitBreaker.js';

const logger = createLogger('gateway-service');

interface ServiceClients {
  authServiceUrl: string;
  creditServiceUrl: string;
  routingServiceUrl: string;
  kafkaPublish: (topic: string, msg: object) => Promise<void>;
  redis: Redis;
  /** TTL in seconds for the validated-token Redis cache. Default: 60. */
  tokenCacheTtlSeconds?: number;
}

interface ValidatedUser {
  userId: string;
  planId: string;
  email: string;
}

interface RoutingResult {
  output: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  model: string;
  provider: string;
}

// FIRST_PARTY_APP_IDS is imported from @ai-gateway/config

type AppAccessResult = 'allowed' | 'invalid_key' | 'forbidden';

interface GatewayServiceDeps {
  httpFetch?: typeof fetch;
}

export class GatewayService {
  private readonly authBreaker = new CircuitBreaker({ serviceName: 'Auth service' });
  private readonly creditBreaker = new CircuitBreaker({ serviceName: 'Credit service' });
  private readonly routingBreaker = new CircuitBreaker({ serviceName: 'Routing service' });

  constructor(
    private readonly clients: ServiceClients,
    private readonly deps: GatewayServiceDeps = {},
  ) {}

  private get httpFetch(): typeof fetch {
    return this.deps.httpFetch ?? fetch;
  }

  // ─────────────────────────────────────────
  // Main: Process AI Request
  // ─────────────────────────────────────────

  async processRequest(input: {
    token: string;
    appId: string;
    appApiKey?: string;
    appJwt?: string;
    model: string;
    messages: GatewayRequest['messages'];
    maxTokens?: number;
    temperature?: number;
  }): Promise<GatewayResponse> {
    const requestId = generateId();
    const startTime = Date.now();

    // Step 1: Validate user token
    const user = await this.validateToken(input.token);
    logger.info({ requestId, userId: user.userId, model: input.model }, 'Processing request');

    // Step 2: Rate Limiting
    const limit = this.getRateLimit(user.planId);
    const rateLimitKey = `ratelimit:gateway:${user.userId}`;
    const currentUsage = await this.clients.redis.incr(rateLimitKey);
    if (currentUsage === 1) {
      await this.clients.redis.expire(rateLimitKey, 60);
    }
    if (currentUsage > limit) {
      throw new GatewayError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429);
    }

    // Step 3: Validate app context
    const appAccess = await this.validateAppAccess(input.appId, input.appApiKey, input.appJwt);
    if (appAccess !== 'allowed') {
      throw appAccess === 'invalid_key' ? Errors.INVALID_APP_KEY() : Errors.FORBIDDEN();
    }

    // Step 4: Estimate cost
    const estimatedTokens = input.maxTokens ?? 1000;
    const estimatedCredits = calculateCredits(input.model, estimatedTokens);

    // Step 4: Lock credits
    await this.lockCredits(user.userId, requestId, estimatedCredits);

    // Step 5: Route to model
    let routingResult: RoutingResult;
    try {
      const TIMEOUT_MS = 30_000;
      const routingPromise = this.routeRequest({
        requestId,
        model: input.model,
        messages: input.messages,
        maxTokens: input.maxTokens,
        temperature: input.temperature,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS)
      );

      routingResult = (await Promise.race([routingPromise, timeoutPromise])) as RoutingResult;
    } catch (err) {
      await this.releaseCredits(user.userId, requestId);
      const latencyMs = Date.now() - startTime;
      void this.publishUsageEvent(
        requestId, user.userId, input.appId, input.model, 'openai',
        0, 0, 0, 0, latencyMs, (err as GatewayError).code,
      );
      throw err instanceof Error && err.message === 'Request timeout'
        ? new GatewayError('GATEWAY_003', 'Request timed out', 504)
        : err;
    }

    // Step 6: Confirm credit deduction
    const actualCredits = calculateCredits(routingResult.model, routingResult.tokensTotal);
    await this.confirmCredits(user.userId, requestId);

    // Step 7: Publish usage event
    const latencyMs = Date.now() - startTime;
    void this.publishUsageEvent(
      requestId, user.userId, input.appId, routingResult.model,
      routingResult.provider as UsageEvent['provider'],
      routingResult.tokensInput, routingResult.tokensOutput, routingResult.tokensTotal,
      actualCredits, latencyMs,
    );

    return {
      requestId,
      output: routingResult.output,
      tokensInput: routingResult.tokensInput,
      tokensOutput: routingResult.tokensOutput,
      tokensTotal: routingResult.tokensTotal,
      creditsDeducted: actualCredits,
      model: routingResult.model,
      provider: routingResult.provider,
      latencyMs,
    };
  }

  // ─────────────────────────────────────────
  // Server-Sent Events (SSE) Streaming
  // ─────────────────────────────────────────

  async *processStreamRequest(input: {
    token: string;
    appId: string;
    appApiKey?: string;
    appJwt?: string;
    model: string;
    messages: GatewayRequest['messages'];
    maxTokens?: number;
    temperature?: number;
  }): AsyncGenerator<string> {
    const requestId = generateId();
    const startTime = Date.now();

    const user = await this.validateToken(input.token);
    logger.info({ requestId, userId: user.userId, model: input.model }, 'Processing stream request');

    const limit = this.getRateLimit(user.planId);
    const rateLimitKey = `ratelimit:gateway:${user.userId}`;
    const currentUsage = await this.clients.redis.incr(rateLimitKey);
    if (currentUsage === 1) await this.clients.redis.expire(rateLimitKey, 60);
    if (currentUsage > limit) throw new GatewayError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429);

    const appAccess = await this.validateAppAccess(input.appId, input.appApiKey, input.appJwt);
    if (appAccess !== 'allowed') {
      throw appAccess === 'invalid_key' ? Errors.INVALID_APP_KEY() : Errors.FORBIDDEN();
    }

    const estimatedTokens = input.maxTokens ?? 1000;
    const estimatedCredits = calculateCredits(input.model, estimatedTokens);
    await this.lockCredits(user.userId, requestId, estimatedCredits);

    let tokenCounter = 0;
    let finalProvider = 'unknown';

    try {
      const stream = await this.routeRequest({
        requestId,
        model: input.model,
        messages: input.messages,
        maxTokens: input.maxTokens,
        temperature: input.temperature,
        stream: true,
      }) as AsyncGenerator<string>;

      for await (const chunk of stream) {
        // Very basic proxy Token counter: assumes 1 token per roughly 4 chars of data payload. 
        // We only estimate this because SSE chunks won't perfectly equate to tokens.
        // A true implementation parses the delta text blocks natively.
        const match = chunk.match(/"output":"(.*?)"/);
        if (match && match[1]) {
           tokenCounter += Math.max(1, Math.floor(match[1].length / 4));
        }
        yield chunk;
      }

      const actualCredits = calculateCredits(input.model, tokenCounter);
      await this.confirmCredits(user.userId, requestId);

      const latencyMs = Date.now() - startTime;
      void this.publishUsageEvent(
        requestId, user.userId, input.appId, input.model, 'openai', // fallback tag
        0, tokenCounter, tokenCounter, actualCredits, latencyMs,
      );

    } catch (err) {
      await this.releaseCredits(user.userId, requestId);
      const latencyMs = Date.now() - startTime;
      void this.publishUsageEvent(
        requestId, user.userId, input.appId, input.model, 'openai',
        0, tokenCounter, tokenCounter, 0, latencyMs, (err as GatewayError).code,
      );
      throw err;
    }
  }

  // ─────────────────────────────────────────
  // Internal Helpers
  // ─────────────────────────────────────────

  private getRateLimit(planId: string): number {
    if (planId === 'pro') return 60;
    if (planId === 'max') return 200;
    return 10;
  }

  private async validateAppAccess(
    appId: string,
    appApiKey?: string,
    appJwt?: string,
  ): Promise<AppAccessResult> {
    if (!appId || FIRST_PARTY_APP_IDS.has(appId)) {
      return 'allowed';
    }

    // Delegate all registered_apps logic to the auth-service.
    // This preserves service isolation: the gateway never queries
    // the registered_apps table directly.
    const json = await this.authBreaker.execute(async () => {
      const res = await this.httpFetch(
        `${this.clients.authServiceUrl}/internal/auth/apps/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appId, appApiKey, appJwt }),
        },
      );
      return res.json() as Promise<{
        success: boolean;
        data?: { result: AppAccessResult };
        error?: { code: string; message: string };
      }>;
    });

    return json.data?.result ?? 'forbidden';
  }

  private async validateToken(token: string): Promise<ValidatedUser> {
    // Check Redis cache before calling the auth service.
    // The token is hashed (SHA-256) so the raw bearer token is never stored as a Redis key.
    const cacheKey = `auth:token:${createHash('sha256').update(token).digest('hex')}`;
    const cached = await this.clients.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as ValidatedUser;
      } catch {
        // Malformed cache entry: remove it and fall through to the auth service.
        await this.clients.redis.del(cacheKey);
      }
    }

    const user = await this.authBreaker.execute(async () => {
      const res = await this.httpFetch(`${this.clients.authServiceUrl}/internal/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = await res.json() as {
        success: boolean;
        data?: ValidatedUser;
        error?: { code: string; message: string };
      };
      if (!res.ok || !json.success || !json.data) throw Errors.INVALID_TOKEN();
      return json.data;
    });

    // Cache the validated user data so subsequent requests skip the auth service call.
    const ttl = this.clients.tokenCacheTtlSeconds ?? 60;
    await this.clients.redis.set(cacheKey, JSON.stringify(user), 'EX', ttl);

    return user;
  }

  private async lockCredits(userId: string, requestId: string, amount: number): Promise<void> {
    await this.creditBreaker.execute(async () => {
      const res = await this.httpFetch(`${this.clients.creditServiceUrl}/credits/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, requestId, amount }),
      });
      if (!res.ok) {
        throw new Error(`Credit lock failed with status ${res.status}`);
      }
      const json = await res.json() as { success: boolean; error?: { code: string; statusCode: number } };
      if (!json.success) {
        const code = json.error?.code ?? 'CREDIT_001';
        throw code === 'CREDIT_002' ? Errors.CREDIT_LOCK_FAILED() : Errors.INSUFFICIENT_CREDITS(0, amount);
      }
    });
  }

  private async confirmCredits(userId: string, requestId: string): Promise<void> {
    await this.creditBreaker.execute(async () => {
      const res = await this.httpFetch(`${this.clients.creditServiceUrl}/credits/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, requestId }),
      });
      if (!res.ok) {
        throw new Error(`Credit confirm failed with status ${res.status}`);
      }
      const json = await res.json() as { success: boolean };
      if (!json.success) {
        throw new Error('Credit confirm response indicated failure');
      }
    });
  }

  private async releaseCredits(userId: string, requestId: string): Promise<void> {
    await this.creditBreaker.execute(async () => {
      const res = await this.httpFetch(`${this.clients.creditServiceUrl}/credits/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, requestId }),
      });
      if (!res.ok) {
        throw new Error(`Credit release failed with status ${res.status}`);
      }
      const json = await res.json() as { success: boolean };
      if (!json.success) {
        throw new Error('Credit release response indicated failure');
      }
    }).catch((err) => {
      logger.warn({ err, userId, requestId }, 'Failed to release credits');
    });
  }

  private async routeRequest(data: {
    requestId: string;
    model: string;
    messages: GatewayRequest['messages'];
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<RoutingResult | AsyncGenerator<string>> {
    return this.routingBreaker.execute(() =>
      withRetry<RoutingResult | AsyncGenerator<string>>(async () => {
        const res = await this.httpFetch(`${this.clients.routingServiceUrl}/internal/routing/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (data.stream) {
          if (!res.body) throw Errors.ROUTING_FAILED();
          async function* streamGenerator() {
            const decoder = new TextDecoder();
            for await (const chunk of res.body! as any) {
              yield decoder.decode(chunk, { stream: true });
            }
          }
          return streamGenerator();
        }

        const json = await res.json() as {
          success: boolean;
          data?: RoutingResult;
          error?: { code: string; message: string };
        };
        if (!json.success || !json.data) throw Errors.ROUTING_FAILED();
        return json.data;
      }),
    );
  }

  private publishUsageEvent(
    requestId: string, userId: string, appId: string, model: string,
    provider: UsageEvent['provider'], tokensInput: number, tokensOutput: number,
    tokensTotal: number, creditsDeducted: number, latencyMs: number, errorCode?: string,
  ): Promise<void> {
    const event: UsageEvent = {
      eventId: generateId(),
      topic: 'usage.events',
      type: errorCode ? 'usage.request.failed' : 'usage.request.completed',
      requestId, userId, appId, model, provider,
      tokensInput, tokensOutput, tokensTotal, creditsDeducted, latencyMs,
      errorCode,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    return this.clients.kafkaPublish(KAFKA_TOPICS.USAGE, event);
  }
}
