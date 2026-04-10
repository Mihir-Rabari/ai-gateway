import { fetch } from 'undici';
import bcrypt from 'bcrypt';
import {
  generateId, Errors, calculateCredits, createLogger, GatewayError, withRetry,
  decryptClientSecret, verifyAppJwt, type AppJwtPayload,
} from '@ai-gateway/utils';
import { KAFKA_TOPICS, FIRST_PARTY_APP_IDS } from '@ai-gateway/config';
import type { GatewayRequest, GatewayResponse, UsageEvent } from '@ai-gateway/types';
import type { Pool } from 'pg';
import type Redis from 'ioredis';

const logger = createLogger('gateway-service');

interface ServiceClients {
  authServiceUrl: string;
  creditServiceUrl: string;
  routingServiceUrl: string;
  kafkaPublish: (topic: string, msg: object) => Promise<void>;
  pgPool: Pool;
  redis: Redis;
  /** AES-256 key (64-char hex) for decrypting stored client secrets. Optional. */
  clientSecretEncryptionKey?: string;
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

/** TTL (seconds) for app-metadata Redis cache entries. */
const APP_CACHE_TTL_SECS = 300; // 5 minutes

interface GatewayServiceDeps {
  httpFetch?: typeof fetch;
  compareHash?: (plain: string, hash: string) => Promise<boolean>;
  /** Injected for unit-testing; defaults to the utils helper. */
  decryptSecret?: (enc: string, keyHex: string) => string;
  /** Injected for unit-testing; defaults to the utils helper. */
  verifyJwt?: (token: string, secret: string) => AppJwtPayload;
}

export class GatewayService {
  constructor(
    private readonly clients: ServiceClients,
    private readonly deps: GatewayServiceDeps = {},
  ) {}

  private get httpFetch(): typeof fetch {
    return this.deps.httpFetch ?? fetch;
  }

  private get compareHash(): (plain: string, hash: string) => Promise<boolean> {
    return this.deps.compareHash ?? bcrypt.compare;
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
      await this.releaseCredits(user.userId, requestId).catch(() => undefined);
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
      await this.releaseCredits(user.userId, requestId).catch(() => undefined);
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

    // ── JWT-based app authentication ──────────────────────────────────────
    // When the developer's app sends X-App-Token (a short-lived HS256 JWT
    // signed with their client secret), verify it using the stored encrypted
    // secret. This avoids long-lived API keys in transit.
    if (appJwt) {
      const encKey = this.clients.clientSecretEncryptionKey;
      if (encKey) {
        try {
          // The payload is decoded before signature verification only to extract
          // the clientId needed for the DB lookup. The extracted clientId is used
          // solely as a lookup key (parameterised query); the full token is then
          // passed to verifyFn which performs the cryptographic check.
          // Any invalid JSON or missing fields are caught by the outer try/catch.
          const jwtParts = appJwt.split('.');
          if (jwtParts.length !== 3) return 'invalid_key';

          let clientId: string | undefined;
          try {
            const rawPayload = Buffer.from(jwtParts[1]!, 'base64url').toString('utf8');
            ({ clientId } = JSON.parse(rawPayload) as { clientId?: string });
          } catch {
            // Malformed base64url or JSON — reject immediately
            return 'invalid_key';
          }

          if (clientId) {
            // ── Redis cache: client secret ──────────────────────────────
            // Cache key stores the encrypted secret (or empty string when the
            // app does not exist / is inactive). This avoids a DB round-trip
            // for every JWT-authenticated AI request.
            const secretCacheKey = `app:clientid:${clientId}:secret_enc`;
            let enc: string | null = null;
            const cachedSecret = await this.clients.redis.get(secretCacheKey);
            if (cachedSecret !== null) {
              // Empty string signals "app not found / inactive"
              enc = cachedSecret === '' ? null : cachedSecret;
            } else {
              const row = await this.clients.pgPool.query<{ client_secret_enc: string | null }>(
                `SELECT client_secret_enc FROM registered_apps
                 WHERE client_id = $1 AND is_active = true`,
                [clientId],
              );
              enc = row.rows[0]?.client_secret_enc ?? null;
              await this.clients.redis.setex(secretCacheKey, APP_CACHE_TTL_SECS, enc ?? '');
            }

            if (enc) {
              const decryptFn = this.deps.decryptSecret ?? decryptClientSecret;
              const verifyFn = this.deps.verifyJwt ?? verifyAppJwt;
              try {
                const secret = decryptFn(enc, encKey);
                verifyFn(appJwt, secret); // throws on invalid sig or expiry
                return 'allowed';
              } catch {
                return 'invalid_key';
              }
            }
          }
        } catch {
          return 'invalid_key';
        }
      }
      // If encryption key not configured, fall through to API-key path
    }

    // ── Legacy API-key authentication ─────────────────────────────────────
    if (appApiKey) {
      // ── Redis cache: API key hashes ─────────────────────────────────────
      // Storing hashed keys in Redis is safe because bcrypt hashes cannot be
      // reversed; the plaintext key is never written to the cache.
      const keysCacheKey = `app:apikeys:${appId}`;
      let keyHashes: string[];
      const cachedHashes = await this.clients.redis.get(keysCacheKey);
      if (cachedHashes !== null) {
        const parsed: unknown = JSON.parse(cachedHashes);
        keyHashes = Array.isArray(parsed) && parsed.every((item): item is string => typeof item === 'string')
          ? parsed
          : [];
      } else {
        const result = await this.clients.pgPool.query(
          `SELECT ak.key_hash
           FROM api_keys ak
           INNER JOIN registered_apps ra ON ra.id = ak.app_id
           WHERE ra.id = $1
             AND ra.is_active = true
             AND ak.revoked_at IS NULL
           ORDER BY ak.created_at DESC`,
          [appId]
        );
        keyHashes = (result.rows as Array<{ key_hash: string }>).map((r) => r.key_hash);
        await this.clients.redis.setex(keysCacheKey, APP_CACHE_TTL_SECS, JSON.stringify(keyHashes));
      }

      for (const keyHash of keyHashes) {
        if (await this.compareHash(appApiKey, keyHash)) {
          return 'allowed';
        }
      }

      return 'invalid_key';
    }

    // ── Redis cache: basic app active status ─────────────────────────────
    const activeCacheKey = `app:active:${appId}`;
    const cachedActive = await this.clients.redis.get(activeCacheKey);
    if (cachedActive === '1') return 'allowed';
    if (cachedActive === '0') return 'forbidden';
    // Unexpected / missing cache value: fall through to DB

    const result = await this.clients.pgPool.query(
      'SELECT id FROM registered_apps WHERE id = $1 AND is_active = true',
      [appId]
    );
    const isActive = (result.rowCount ?? 0) > 0;
    await this.clients.redis.setex(activeCacheKey, APP_CACHE_TTL_SECS, isActive ? '1' : '0');
    return isActive ? 'allowed' : 'forbidden';
  }

  private async validateToken(token: string): Promise<ValidatedUser> {
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
    if (!json.success || !json.data) throw Errors.INVALID_TOKEN();
    return json.data;
  }

  private async lockCredits(userId: string, requestId: string, amount: number): Promise<void> {
    const res = await this.httpFetch(`${this.clients.creditServiceUrl}/credits/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, requestId, amount }),
    });
    const json = await res.json() as { success: boolean; error?: { code: string; statusCode: number } };
    if (!json.success) {
      const code = json.error?.code ?? 'CREDIT_001';
      throw code === 'CREDIT_002' ? Errors.CREDIT_LOCK_FAILED() : Errors.INSUFFICIENT_CREDITS(0, amount);
    }
  }

  private async confirmCredits(userId: string, requestId: string): Promise<void> {
    await this.httpFetch(`${this.clients.creditServiceUrl}/credits/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, requestId }),
    });
  }

  private async releaseCredits(userId: string, requestId: string): Promise<void> {
    await this.httpFetch(`${this.clients.creditServiceUrl}/credits/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, requestId }),
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
    return withRetry<RoutingResult | AsyncGenerator<string>>(async () => {
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
    });
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
