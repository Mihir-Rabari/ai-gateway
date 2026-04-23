import { fetch } from 'undici';
import bcrypt from 'bcrypt';
import { generateId, Errors, calculateCredits, createLogger, GatewayError } from '@ai-gateway/utils';
import { KAFKA_TOPICS } from '@ai-gateway/config';
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

export class GatewayService {
  constructor(private readonly clients: ServiceClients) {}

  // ─────────────────────────────────────────
  // Main: Process AI Request
  // ─────────────────────────────────────────

  async processRequest(input: {
    token: string;
    appId: string;
    model: string;
    messages: GatewayRequest['messages'];
    maxTokens?: number;
    temperature?: number;
  }): Promise<GatewayResponse> {
    const requestId = generateId();
    const startTime = Date.now();

    // Step 1: Validate user token or API key
    const user = await this.validateToken(input.token, input.appId);
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

    // Step 3: Validate App ID
    if (input.appId && input.appId !== 'unknown') {
      const isValidApp = await this.validateAppKey(input.appId);
      if (!isValidApp) {
        throw Errors.FORBIDDEN();
      }
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

      routingResult = await Promise.race([routingPromise, timeoutPromise]);
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
  // Internal Helpers
  // ─────────────────────────────────────────

  private getRateLimit(planId: string): number {
    if (planId === 'pro') return 60;
    if (planId === 'max') return 200;
    return 10;
  }

  private async validateAppKey(appId: string): Promise<boolean> {
    const result = await this.clients.pgPool.query(
      'SELECT id FROM registered_apps WHERE id = $1 AND is_active = true',
      [appId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private async validateToken(token: string, appId: string): Promise<ValidatedUser> {
    if (token.startsWith('agk_')) {
      if (!appId || appId === 'unknown') {
        throw Errors.INVALID_TOKEN();
      }

      // Fetch active API keys for this app and verify
      const result = await this.clients.pgPool.query(
        `SELECT k.key_hash, a.developer_id, u.plan_id, u.email
         FROM api_keys k
         JOIN registered_apps a ON k.app_id = a.id
         JOIN users u ON a.developer_id = u.id
         WHERE k.app_id = $1 AND k.revoked_at IS NULL AND a.is_active = true AND u.is_active = true`,
        [appId]
      );

      for (const row of result.rows) {
        const isValid = await bcrypt.compare(token, row.key_hash);
        if (isValid) {
          return {
            userId: row.developer_id,
            planId: row.plan_id,
            email: row.email,
          };
        }
      }

      throw Errors.INVALID_TOKEN();
    }

    const res = await fetch(`${this.clients.authServiceUrl}/internal/auth/validate`, {
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
    const res = await fetch(`${this.clients.creditServiceUrl}/credits/lock`, {
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
    await fetch(`${this.clients.creditServiceUrl}/credits/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, requestId }),
    });
  }

  private async releaseCredits(userId: string, requestId: string): Promise<void> {
    await fetch(`${this.clients.creditServiceUrl}/credits/release`, {
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
  }): Promise<RoutingResult> {
    const res = await fetch(`${this.clients.routingServiceUrl}/internal/routing/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json() as {
      success: boolean;
      data?: RoutingResult;
      error?: { code: string; message: string };
    };
    if (!json.success || !json.data) throw Errors.ROUTING_FAILED();
    return json.data;
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
