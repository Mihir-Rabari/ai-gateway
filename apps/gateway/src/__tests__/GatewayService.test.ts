import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type Redis from 'ioredis';
import { GatewayService } from '../services/gatewayService.js';

function createFetchMock(appValidateResult: 'allowed' | 'invalid_key' | 'forbidden' = 'allowed') {
  return async (url: string | URL | globalThis.Request, init?: RequestInit) => {
    const normalizedUrl = typeof url === 'string' ? url : String(url);

    if (normalizedUrl.includes('/internal/auth/validate')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
        }),
      } as Response;
    }

    if (normalizedUrl.includes('/internal/auth/apps/validate')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { result: appValidateResult },
        }),
      } as Response;
    }

    if (normalizedUrl.includes('/credits/lock')) {
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/credits/confirm')) {
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/credits/release')) {
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    }

    if (normalizedUrl.includes('/internal/routing/route')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            output: 'hello',
            tokensInput: 10,
            tokensOutput: 12,
            tokensTotal: 22,
            model: 'gpt-4o',
            provider: 'openai',
          },
        }),
      } as Response;
    }

    throw new Error(`Unexpected fetch URL: ${normalizedUrl}`);
  };
}

function createRedisMockWithStore(store: Map<string, string> = new Map()) {
  const redis = {
    incr: async (key: string) => {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    },
    expire: async () => 1,
    eval: async (script: string, numKeys: number, key: string, arg: string) => {
      const next = Number(store.get(key) ?? '0') + 1;
      store.set(key, String(next));
      return next;
    },
    get: async (key: string) => store.get(key) ?? null,
    // redis.set(key, value, 'EX', ttl) — used by validateToken token cache
    set: async (key: string, value: string) => { store.set(key, value); return 'OK'; },
    setex: async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK' as const;
    },
    del: async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) { if (store.delete(key)) count++; }
      return count;
    },
  } as unknown as Redis;
  return { redis, store };
}

function createRedisMock(store: Map<string, string> = new Map()) {
  return createRedisMockWithStore(store).redis;
}

describe('GatewayService', () => {
  test('allows reserved first-party app IDs without calling auth-service app validation', async () => {
    let appValidateCallCount = 0;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/apps/validate')) {
        appValidateCallCount += 1;
      }
      return createFetchMock()(url, init);
    };

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, {
      httpFetch: fetchMock,
    });

    const result = await service.processRequest({
      token: 'access-token',
      appId: 'api-direct',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.output, 'hello');
    assert.equal(appValidateCallCount, 0, 'auth-service app validate should not be called for first-party app IDs');
  });

  test('accepts developer app requests when auth-service returns allowed for an API key', async () => {
    let appValidateCallCount = 0;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/apps/validate')) {
        appValidateCallCount += 1;
      }
      return createFetchMock('allowed')(url, init);
    };

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, {
      httpFetch: fetchMock,
    });

    const result = await service.processRequest({
      token: 'access-token',
      appId: 'app-123',
      appApiKey: 'agk_live_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.provider, 'openai');
    assert.equal(appValidateCallCount, 1, 'auth-service app validate should be called once');
  });

  test('rejects developer app requests when auth-service returns invalid_key', async () => {
    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, {
      httpFetch: createFetchMock('invalid_key'),
    });

    await assert.rejects(
      () => service.processRequest({
        token: 'access-token',
        appId: 'app-123',
        appApiKey: 'wrong-key',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_000',
    );
  });

  test('accepts developer app requests authenticated via a signed X-App-Token JWT when auth-service returns allowed', async () => {
    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, {
      httpFetch: createFetchMock('allowed'),
    });

    const payloadB64 = Buffer.from(JSON.stringify({ clientId: 'client_test', iat: 0, exp: 9999999999 })).toString('base64url');
    const fakeAppJwt = `aGVhZGVy.${payloadB64}.c2lnbmF0dXJl`;

    const result = await service.processRequest({
      token: 'access-token',
      appId: 'app-123',
      appJwt: fakeAppJwt,
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(result.output, 'hello');
  });

  test('rejects X-App-Token when auth-service returns invalid_key for JWT', async () => {
    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, {
      httpFetch: createFetchMock('invalid_key'),
    });

    const payloadB64 = Buffer.from(JSON.stringify({ clientId: 'client_test', iat: 0, exp: 9999999999 })).toString('base64url');
    const fakeAppJwt = `aGVhZGVy.${payloadB64}.d3Jvbmctc2ln`;

    await assert.rejects(
      () => service.processRequest({
        token: 'access-token',
        appId: 'app-123',
        appJwt: fakeAppJwt,
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_000',
    );
  });

  test('caches validated token so the auth service is only called once for repeated requests', async () => {
    let authCallCount = 0;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/validate')) {
        authCallCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
          }),
        } as Response;
      }
      return createFetchMock()(url, init);
    };

    const redisStore = new Map<string, string>();

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(redisStore),
      tokenCacheTtlSeconds: 60,
    }, { httpFetch: fetchMock });

    const req = { token: 'my-token', appId: 'api-direct', model: 'gpt-4o', messages: [{ role: 'user' as const, content: 'hi' }] };

    await service.processRequest(req);
    await service.processRequest(req);

    assert.equal(authCallCount, 1, 'Auth service should only be called once; second request uses cache');
  });

  test('auth circuit breaker opens after threshold failures and fast-fails subsequent requests', async () => {
    const THRESHOLD = 5;
    let authCallCount = 0;

    const failingFetch = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/validate')) {
        authCallCount += 1;
        throw new Error('Auth service down');
      }
      return createFetchMock()(url, init);
    };

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, { httpFetch: failingFetch });

    const req = { token: 'bad-token', appId: 'api-direct', model: 'gpt-4o', messages: [{ role: 'user' as const, content: 'hi' }] };

    // Drive failures up to (and including) the threshold to open the circuit.
    for (let i = 0; i < THRESHOLD; i++) {
      await assert.rejects(() => service.processRequest(req));
    }

    // The next call should be rejected by the open circuit (not by the auth service).
    const authCallsBeforeOpen = authCallCount;
    await assert.rejects(
      () => service.processRequest(req),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_004',
    );
    assert.equal(authCallCount, authCallsBeforeOpen, 'No additional auth calls should be made when circuit is open');
  });

  test('credit circuit breaker opens after threshold failures and fast-fails lock requests', async () => {
    const THRESHOLD = 5;
    let creditCallCount = 0;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/credits/lock')) {
        creditCallCount += 1;
        throw new Error('Credit service down');
      }
      return createFetchMock()(url, init);
    };

    const redisStore = new Map<string, string>();

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(redisStore),
      tokenCacheTtlSeconds: 60,
    }, { httpFetch: fetchMock });

    const req = { token: 'my-token', appId: 'api-direct', model: 'gpt-4o', messages: [{ role: 'user' as const, content: 'hi' }] };

    // Drive failures up to (and including) the threshold to open the circuit.
    for (let i = 0; i < THRESHOLD; i++) {
      await assert.rejects(() => service.processRequest(req));
    }

    // The next call should be rejected by the open circuit (not by the credit service).
    const creditCallsBeforeOpen = creditCallCount;
    await assert.rejects(
      () => service.processRequest(req),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_004',
    );
    assert.equal(creditCallCount, creditCallsBeforeOpen, 'No additional credit calls should be made when circuit is open');
  });

  test('circuit breaker resets failure counter on successful calls so intermittent errors do not open the circuit', async () => {
    const THRESHOLD = 5;
    let shouldFail = false;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/validate')) {
        if (shouldFail) throw new Error('Auth service down');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
          }),
        } as Response;
      }
      return createFetchMock()(url, init);
    };

    // Use a Redis mock that never returns cached tokens so every request reaches the auth service.
    const noopRedis = {
      incr: async () => 1,
      expire: async () => 1,
      eval: async () => 1,
      get: async (_key: string) => null,
      set: async () => 'OK',
      del: async () => 1,
    } as unknown as Redis;

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: noopRedis,
    }, { httpFetch: fetchMock });

    // Use a unique token per call so each iteration starts with a fresh cache miss.
    let counter = 0;
    const makeReq = () => ({
      token: `token-${counter++}`,
      appId: 'api-direct',
      model: 'gpt-4o',
      messages: [{ role: 'user' as const, content: 'hi' }],
    });

    // Alternate failures and successes — the counter should reset on each success.
    for (let i = 0; i < THRESHOLD - 1; i++) {
      shouldFail = true;
      await assert.rejects(() => service.processRequest(makeReq()));
      // A success clears the failure count.
      shouldFail = false;
      await service.processRequest(makeReq());
    }

    // After all those failures+successes the circuit must still be closed.
    shouldFail = false;
    const result = await service.processRequest(makeReq());
    assert.equal(result.output, 'hello', 'Circuit should still be closed after intermittent failures');
  });

  test('falls back to the auth service when the cached token entry is malformed JSON', async () => {
    let authCallCount = 0;
    const redisStore = new Map<string, string>();
    // Seed a malformed (non-JSON) value so the cache-read triggers the fallback.
    redisStore.set(
      `auth:token:${(await import('crypto')).createHash('sha256').update('my-token').digest('hex')}`,
      'not-valid-json{{',
    );

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/validate')) {
        authCallCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
          }),
        } as Response;
      }
      return createFetchMock()(url, init);
    };

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(redisStore),
    }, { httpFetch: fetchMock });

    const result = await service.processRequest({
      token: 'my-token',
      appId: 'api-direct',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hi' }],
    });

    assert.equal(result.output, 'hello');
    assert.equal(authCallCount, 1, 'Auth service should be called when cached entry is malformed');
  });

  test('forwards appId, appApiKey and appJwt to auth-service app validation endpoint', async () => {
    let capturedBody: Record<string, unknown> = {};

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/apps/validate')) {
        capturedBody = JSON.parse((init as RequestInit & { body: string }).body ?? '{}') as Record<string, unknown>;
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { result: 'allowed' } }),
        } as Response;
      }
      return createFetchMock()(url, init);
    };

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, { httpFetch: fetchMock });

    await service.processRequest({
      token: 'access-token',
      appId: 'app-xyz',
      appApiKey: 'agk_key',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal(capturedBody['appId'], 'app-xyz', 'appId should be forwarded');
    assert.equal(capturedBody['appApiKey'], 'agk_key', 'appApiKey should be forwarded');
  });

  test('app validation via auth-service: forbidden apps are rejected', async () => {
    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, {
      httpFetch: createFetchMock('forbidden'),
    });

    await assert.rejects(
      () => service.processRequest({
        token: 'access-token',
        appId: 'inactive-app',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      (err: unknown) => (err as { code?: string }).code === 'AUTH_003',
    );
  });

  test('app-validation 5xx causes the app-validation circuit breaker to open, not the auth-token breaker', async () => {
    const THRESHOLD = 5;
    let appValidateCallCount = 0;
    let tokenValidateCallCount = 0;

    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);

      if (normalizedUrl.includes('/internal/auth/apps/validate')) {
        appValidateCallCount += 1;
        // Return a 503 so the gateway throws and the app-validation breaker records a failure.
        return {
          ok: false,
          status: 503,
          json: async () => ({ success: false, error: { code: 'UPSTREAM', message: 'Service unavailable' } }),
        } as Response;
      }

      if (normalizedUrl.includes('/internal/auth/validate')) {
        tokenValidateCallCount += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', planId: 'pro', email: 'user@example.com' },
          }),
        } as Response;
      }

      return createFetchMock()(url, init);
    };

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, { httpFetch: fetchMock });

    const req = {
      token: 'access-token',
      appId: 'developer-app',
      appApiKey: 'some-key',
      model: 'gpt-4o',
      messages: [{ role: 'user' as const, content: 'hi' }],
    };

    // Drive app-validation failures up to the threshold to open its circuit.
    for (let i = 0; i < THRESHOLD; i++) {
      await assert.rejects(() => service.processRequest(req));
    }

    // Now the app-validation breaker should be open: the next call for a dev app should
    // fast-fail with GATEWAY_004 without calling the app-validate endpoint again.
    const appCallsBeforeOpen = appValidateCallCount;
    await assert.rejects(
      () => service.processRequest(req),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_004',
    );
    assert.equal(appValidateCallCount, appCallsBeforeOpen, 'App-validate endpoint should not be called when its circuit is open');

    // Critically: the auth-token breaker must still be healthy — a first-party request
    // (which skips app-validate entirely) should succeed with no issue.
    const tokenCallsBefore = tokenValidateCallCount;
    const result = await service.processRequest({
      token: 'fresh-token',
      appId: 'api-direct', // first-party: bypasses app-validation entirely
      model: 'gpt-4o',
      messages: [{ role: 'user' as const, content: 'hi' }],
    });
    assert.equal(result.output, 'hello', 'First-party requests must succeed even when the app-validation circuit is open');
    assert.equal(tokenValidateCallCount, tokenCallsBefore + 1, 'Token validate endpoint must still be reachable');
  });

  test('app-validation 5xx is not silently downgraded to forbidden — a GATEWAY_005 error is thrown', async () => {
    const fetchMock = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      if (normalizedUrl.includes('/internal/auth/apps/validate')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ success: false, error: { code: 'INTERNAL', message: 'Internal server error' } }),
        } as Response;
      }
      return createFetchMock()(url, init);
    };

    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async () => undefined,
      redis: createRedisMock(),
    }, { httpFetch: fetchMock });

    await assert.rejects(
      () => service.processRequest({
        token: 'access-token',
        appId: 'some-developer-app',
        appApiKey: 'some-key',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_005',
      'A 5xx from the app-validation service must surface as GATEWAY_005, not AUTH_003 (forbidden)',
    );
  });

  // ─── Streaming: native usage metrics ─────────────────────────────────────

  test('processStreamRequest uses native usage metrics from routing service instead of char-count estimation', async () => {
    const usageEvent = JSON.stringify({
      usage: { tokensInput: 15, tokensOutput: 32, tokensTotal: 47 },
      provider: 'openai',
    });

    // Build a mock fetch that returns a streaming response with output + usage SSE events
    const streamFetch = async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);

      if (normalizedUrl.includes('/internal/auth/validate')) {
        return {
          ok: true, status: 200,
          json: async () => ({ success: true, data: { userId: 'user-stream', planId: 'pro', email: 'u@example.com' } }),
        } as Response;
      }
      if (normalizedUrl.includes('/credits/lock')) {
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }
      if (normalizedUrl.includes('/credits/confirm')) {
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }
      if (normalizedUrl.includes('/credits/release')) {
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }
      if (normalizedUrl.includes('/internal/routing/route')) {
        // Return a streaming body with output chunks + usage event + [DONE]
        const sseData = [
          `data: ${JSON.stringify({ output: 'Hello' })}\n\n`,
          `data: ${JSON.stringify({ output: ' world' })}\n\n`,
          `data: ${usageEvent}\n\n`,
          `data: [DONE]\n\n`,
        ].join('');

        const encoder = new TextEncoder();
        const body = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(sseData));
            controller.close();
          },
        });
        return { ok: true, status: 200, body } as unknown as Response;
      }
      throw new Error(`Unexpected fetch URL: ${normalizedUrl}`);
    };

    const publishedEvents: Array<{ topic: string; msg: object }> = [];
    const service = new GatewayService({
      authServiceUrl: 'http://auth-service',
      creditServiceUrl: 'http://credit-service',
      routingServiceUrl: 'http://routing-service',
      kafkaPublish: async (topic, msg) => { publishedEvents.push({ topic, msg }); },
      redis: createRedisMock(),
    }, { httpFetch: streamFetch as typeof fetch });

    const chunks: string[] = [];
    for await (const chunk of service.processStreamRequest({
      token: 'access-token',
      appId: 'web-direct',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    })) {
      chunks.push(chunk);
    }

    // Usage event must NOT be forwarded to the client
    assert.ok(!chunks.some((c) => c.includes('"usage"')), 'usage event should not be forwarded to client');

    // Output chunks should be forwarded
    assert.ok(chunks.some((c) => c.includes('"output":"Hello"')), 'output chunks should be forwarded');

    // Usage event should contain actual provider metrics in the published Kafka event
    const usageKafkaEvent = publishedEvents.find((e) => {
      const msg = e.msg as { type?: string };
      return msg.type === 'usage.request.completed';
    });
    assert.ok(usageKafkaEvent, 'should publish a usage.request.completed event');
    const kafkaMsg = usageKafkaEvent!.msg as {
      tokensInput: number; tokensOutput: number; tokensTotal: number; provider: string;
    };
    assert.equal(kafkaMsg.tokensInput, 15, 'should use native tokensInput from provider');
    assert.equal(kafkaMsg.tokensOutput, 32, 'should use native tokensOutput from provider');
    assert.equal(kafkaMsg.tokensTotal, 47, 'should use native tokensTotal from provider');
    assert.equal(kafkaMsg.provider, 'openai', 'should use provider from usage event');
  });

});

