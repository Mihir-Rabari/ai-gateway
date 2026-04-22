import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type Redis from 'ioredis';
import { RoutingService } from '../services/routingService.js';

function createRedisMock(initialState: Record<string, string> = {}) {
  const state = new Map(Object.entries(initialState));

  return {
    get: async (key: string) => state.get(key) ?? null,
    mget: async (keys: string[]) => {
      return keys.map((k) => state.get(k) ?? null);
    },
    setex: async (key: string, _ttl: number, value: string) => {
      state.set(key, value);
      return 'OK';
    },
    incr: async (key: string) => {
      const next = Number(state.get(key) ?? '0') + 1;
      state.set(key, String(next));
      return next;
    },
    expire: async () => 1,
    eval: async (script: string, numKeys: number, key: string, ...args: any[]) => {
      // Mock the SLIDING_WINDOW_LUA behavior
      const next = Number(state.get(key) ?? '0') + 1;
      state.set(key, String(next));
      return next;
    },
    del: async (...keys: string[]) => {
      let deleted = 0;
      for (const key of keys) {
        if (state.delete(key)) {
          deleted += 1;
        }
      }
      return deleted;
    },
  } as unknown as Redis;
}

function createOpenAiClient(options: {
  responses?: Array<{
    response?: { content?: string; promptTokens?: number; completionTokens?: number; totalTokens?: number };
    error?: Error;
  }>;
} = {}) {
  let callIndex = 0;

  return {
    chat: {
      completions: {
        create: async () => {
          const fallback = options.responses && options.responses.length > 0
            ? options.responses[options.responses.length - 1]
            : undefined;
          const current = options.responses?.[callIndex] ?? fallback;
          callIndex += 1;

          if (current?.error) {
            throw current.error;
          }

          return {
            choices: [
              {
                message: {
                  content: current?.response?.content ?? 'openai-response',
                },
              },
            ],
            usage: {
              prompt_tokens: current?.response?.promptTokens ?? 11,
              completion_tokens: current?.response?.completionTokens ?? 7,
              total_tokens: current?.response?.totalTokens ?? 18,
            },
          };
        },
      },
    },
  };
}

function createAnthropicClient(options: {
  text?: string;
  error?: Error;
} = {}) {
  return {
    messages: {
      create: async () => {
        if (options.error) {
          throw options.error;
        }

        return {
          content: [{ type: 'text', text: options.text ?? 'anthropic-response' }],
          usage: {
            input_tokens: 8,
            output_tokens: 4,
          },
        };
      },
    },
  };
}

function createGoogleClient(options: {
  responses?: Array<{
    text?: string;
    usage?: { prompt?: number; completion?: number; total?: number };
    error?: Error;
  }>;
} = {}) {
  let callIndex = 0;

  return {
    getGenerativeModel: () => ({
      generateContent: async () => {
        const fallback = options.responses && options.responses.length > 0
          ? options.responses[options.responses.length - 1]
          : undefined;
        const current = options.responses?.[callIndex] ?? fallback;
        callIndex += 1;

        if (current?.error) {
          throw current.error;
        }

        return {
          response: {
            text: () => current?.text ?? 'google-response',
            usageMetadata: {
              promptTokenCount: current?.usage?.prompt ?? 9,
              candidatesTokenCount: current?.usage?.completion ?? 5,
              totalTokenCount: current?.usage?.total ?? 14,
            },
          },
        };
      },
      generateContentStream: async () => ({
        stream: (async function* () {
          yield { text: () => 'google-stream' };
        })(),
        response: Promise.resolve({
          usageMetadata: {
            promptTokenCount: 9,
            candidatesTokenCount: 5,
            totalTokenCount: 14,
          },
        }),
      }),
    }),
  };
}

describe('RoutingService', () => {
  test('routes supported OpenAI models to the primary provider', async () => {
    const publishedEvents: Array<{ topic: string; msg: object }> = [];
    const service = new RoutingService(
      async (topic, msg) => {
        publishedEvents.push({ topic, msg });
      },
      createRedisMock(),
      {
        openaiClient: createOpenAiClient(),
        anthropicClient: createAnthropicClient(),
        googleClient: createGoogleClient(),
      },
    );

    const result = await service.route({
      requestId: 'req-openai',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal('provider' in result ? result.provider : undefined, 'openai');
    assert.equal('output' in result ? result.output : undefined, 'openai-response');
    assert.equal(publishedEvents.length, 1);
    const routingEvent = publishedEvents[0]?.msg as { type: string; latencyMs?: number };
    assert.equal(routingEvent.type, 'routing.selected');
    assert.ok(typeof routingEvent.latencyMs === 'number');
    assert.ok((routingEvent.latencyMs ?? -1) >= 0);
  });

  test('falls back when the primary provider fails', async () => {
    const publishedEvents: Array<{ topic: string; msg: object }> = [];
    const redis = createRedisMock();
    const service = new RoutingService(
      async (topic, msg) => {
        publishedEvents.push({ topic, msg });
      },
      redis,
      {
        openaiClient: createOpenAiClient({
          responses: [
            { error: new Error('openai down') },
            { response: { content: 'fallback-openai-response' } },
          ],
        }),
        anthropicClient: createAnthropicClient(),
        googleClient: createGoogleClient(),
      },
    );

    const result = await service.route({
      requestId: 'req-fallback',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
    });

    assert.equal('provider' in result ? result.provider : undefined, 'openai');
    assert.equal('output' in result ? result.output : undefined, 'fallback-openai-response');
    const failureCount = await redis.get('provider:failures:openai');
    assert.equal(failureCount, null);
    assert.equal(publishedEvents.length, 1);
    const routingEvent = publishedEvents[0]?.msg as { type: string; latencyMs?: number; reason?: string };
    assert.equal(routingEvent.type, 'routing.fallback');
    assert.ok(typeof routingEvent.latencyMs === 'number');
    assert.ok((routingEvent.latencyMs ?? -1) >= 0);
    assert.ok(routingEvent.reason?.includes('Primary gpt-4o failed or unhealthy'));
  });

  test('returns routing failed when the primary and fallback attempts both fail', async () => {
    const service = new RoutingService(
      async () => undefined,
      createRedisMock(),
      {
        openaiClient: createOpenAiClient(),
        anthropicClient: createAnthropicClient(),
        googleClient: createGoogleClient({
          responses: [
            { error: new Error('google primary down') },
            { error: new Error('google fallback down') },
          ],
        }),
      },
    );

    await assert.rejects(
      () =>
        service.route({
          requestId: 'req-fail',
          model: 'gemini-2.5-pro',
          messages: [{ role: 'user', content: 'hello' }],
        }),
      (err: unknown) => (err as { code?: string }).code === 'GATEWAY_002',
    );
  });

  test('reports provider health and failure counts from Redis', async () => {
    const redis = createRedisMock({
      'provider:unhealthy:anthropic': '1',
      'provider:failures:anthropic': '3',
    });

    const service = new RoutingService(
      async () => undefined,
      redis,
      {
        openaiClient: createOpenAiClient(),
        anthropicClient: createAnthropicClient(),
        googleClient: createGoogleClient(),
      },
    );

    const providers = await service.getProvidersHealth();
    const anthropic = providers.find((provider) => provider.name === 'anthropic');

    assert.ok(anthropic);
    assert.equal(anthropic.healthy, false);
    assert.equal(anthropic.failureCount, 3);
  });

  test('OpenAI streaming emits output chunks followed by a native usage SSE event', async () => {
    const openaiStreamClient = {
      chat: {
        completions: {
          create: async () =>
            (async function* () {
              yield { choices: [{ delta: { content: 'Hello' } }], usage: null };
              yield { choices: [{ delta: { content: ' world' } }], usage: null };
              // Final chunk with usage (stream_options: { include_usage: true })
              yield { choices: [], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
            })(),
        },
      },
    };

    const service = new RoutingService(
      async () => undefined,
      createRedisMock(),
      {
        openaiClient: openaiStreamClient,
        anthropicClient: createAnthropicClient(),
        googleClient: createGoogleClient(),
      },
    );

    const result = await service.route({
      requestId: 'req-openai-stream',
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });

    assert.ok(Symbol.asyncIterator in Object(result), 'result should be async iterable');

    const chunks: string[] = [];
    for await (const chunk of result as AsyncIterable<string>) {
      chunks.push(chunk);
    }

    // Should yield output chunks followed by a usage event and [DONE]
    assert.ok(chunks.some((c) => c.includes('"output":"Hello"')), 'should include first output chunk');
    assert.ok(chunks.some((c) => c.includes('"output":" world"')), 'should include second output chunk');
    const usageChunk = chunks.find((c) => c.includes('"usage"'));
    assert.ok(usageChunk, 'should emit a usage SSE event');
    const usagePayload = JSON.parse(usageChunk!.replace(/^data: /, '').trim()) as {
      usage: { tokensInput: number; tokensOutput: number; tokensTotal: number };
      provider: string;
    };
    assert.equal(usagePayload.usage.tokensInput, 10);
    assert.equal(usagePayload.usage.tokensOutput, 5);
    assert.equal(usagePayload.usage.tokensTotal, 15);
    assert.equal(usagePayload.provider, 'openai');
    assert.ok(chunks[chunks.length - 1]?.includes('[DONE]'), 'last chunk should be [DONE]');
  });

  test('Anthropic streaming emits output chunks followed by a native usage SSE event', async () => {
    const anthropicStreamClient = {
      messages: {
        create: async () =>
          (async function* () {
            yield { type: 'message_start', message: { usage: { input_tokens: 8, output_tokens: 0 } } };
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi there' } };
            yield { type: 'message_delta', usage: { output_tokens: 4 } };
            yield { type: 'message_stop' };
          })(),
      },
    };

    const service = new RoutingService(
      async () => undefined,
      createRedisMock(),
      {
        openaiClient: createOpenAiClient(),
        anthropicClient: anthropicStreamClient,
        googleClient: createGoogleClient(),
      },
    );

    const result = await service.route({
      requestId: 'req-anthropic-stream',
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });

    assert.ok(Symbol.asyncIterator in Object(result), 'result should be async iterable');

    const chunks: string[] = [];
    for await (const chunk of result as AsyncIterable<string>) {
      chunks.push(chunk);
    }

    assert.ok(chunks.some((c) => c.includes('"output":"Hi there"')), 'should include output chunk');
    const usageChunk = chunks.find((c) => c.includes('"usage"'));
    assert.ok(usageChunk, 'should emit a usage SSE event');
    const usagePayload = JSON.parse(usageChunk!.replace(/^data: /, '').trim()) as {
      usage: { tokensInput: number; tokensOutput: number; tokensTotal: number };
      provider: string;
    };
    assert.equal(usagePayload.usage.tokensInput, 8);
    assert.equal(usagePayload.usage.tokensOutput, 4);
    assert.equal(usagePayload.usage.tokensTotal, 12);
    assert.equal(usagePayload.provider, 'anthropic');
    assert.ok(chunks[chunks.length - 1]?.includes('[DONE]'), 'last chunk should be [DONE]');
  });

  test('Google streaming emits output chunks followed by a native usage SSE event', async () => {
    const googleStreamClient = {
      getGenerativeModel: () => ({
        generateContent: async () => ({
          response: {
            text: () => 'google-response',
            usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 5, totalTokenCount: 14 },
          },
        }),
        generateContentStream: async () => ({
          stream: (async function* () {
            yield { text: () => 'google-stream-chunk' };
          })(),
          response: Promise.resolve({
            usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 5, totalTokenCount: 14 },
          }),
        }),
      }),
    };

    const service = new RoutingService(
      async () => undefined,
      createRedisMock(),
      {
        openaiClient: createOpenAiClient(),
        anthropicClient: createAnthropicClient(),
        googleClient: googleStreamClient,
      },
    );

    const result = await service.route({
      requestId: 'req-google-stream',
      model: 'gemini-2.5-pro',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
    });

    assert.ok(Symbol.asyncIterator in Object(result), 'result should be async iterable');

    const chunks: string[] = [];
    for await (const chunk of result as AsyncIterable<string>) {
      chunks.push(chunk);
    }

    assert.ok(chunks.some((c) => c.includes('"output":"google-stream-chunk"')), 'should include output chunk');
    const usageChunk = chunks.find((c) => c.includes('"usage"'));
    assert.ok(usageChunk, 'should emit a usage SSE event');
    const usagePayload = JSON.parse(usageChunk!.replace(/^data: /, '').trim()) as {
      usage: { tokensInput: number; tokensOutput: number; tokensTotal: number };
      provider: string;
    };
    assert.equal(usagePayload.usage.tokensInput, 9);
    assert.equal(usagePayload.usage.tokensOutput, 5);
    assert.equal(usagePayload.usage.tokensTotal, 14);
    assert.equal(usagePayload.provider, 'google');
    assert.ok(chunks[chunks.length - 1]?.includes('[DONE]'), 'last chunk should be [DONE]');
  });
});
