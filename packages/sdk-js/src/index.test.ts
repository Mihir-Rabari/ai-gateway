import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { AIGateway } from './index.js';

describe('AIGateway SDK', () => {
  let ai: AIGateway;

  beforeEach(() => {
    ai = new AIGateway({ appId: 'app_123', apiKey: 'agk_abc' });
  });

  it('chat() sends correct headers + body', async () => {
    const fetchMock = mock.fn(async () => {
      return {
        json: async () => ({
          success: true,
          data: {
            output: 'Hello world',
            creditsDeducted: 10,
            model: 'gpt-4o',
            provider: 'openai',
            tokensInput: 2,
            tokensOutput: 2,
            tokensTotal: 4,
            latencyMs: 100,
            requestId: 'req_123',
          },
        }),
      } as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await ai.chat({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      maxTokens: 100,
    });

    assert.equal(fetchMock.mock.calls.length, 1);
    const callArgs = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
    const url = callArgs[0];
    const options = callArgs[1];

    assert.equal(url, 'https://api.ai-gateway.io/api/v1/chat');
    assert.equal(options.method, 'POST');
    assert.equal((options.headers as Record<string, string>)['X-App-Id'], 'app_123');
    assert.equal((options.headers as Record<string, string>)['Authorization'], 'Bearer agk_abc');
    assert.equal((options.headers as Record<string, string>)['Content-Type'], 'application/json');

    const body = JSON.parse(options.body as string);
    assert.equal(body.model, 'gpt-4o');
    assert.deepEqual(body.messages, [{ role: 'user', content: 'Hi' }]);
    assert.equal(body.maxTokens, 100);

    assert.equal(result.output, 'Hello world');
    assert.equal(result.creditsUsed, 10);
  });

  it('chat() throws on error response', async () => {
    const fetchMock = mock.fn(async () => {
      return {
        json: async () => ({
          success: false,
          error: { message: 'Insufficient credits' },
        }),
      } as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await assert.rejects(
      async () => ai.chat({ model: 'gpt-4o', messages: [] }),
      /AIGateway chat error: Insufficient credits/
    );
  });

  it('credits() returns balance', async () => {
    const fetchMock = mock.fn(async () => {
      return {
        json: async () => ({
          success: true,
          data: { balance: 95, planId: 'free' },
        }),
      } as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await ai.credits();
    assert.equal(result.balance, 95);
    assert.equal(result.planId, 'free');

    assert.equal(fetchMock.mock.calls.length, 1);
    const callArgs = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
    const url = callArgs[0];
    const options = callArgs[1];

    assert.equal(url, 'https://api.ai-gateway.io/api/v1/credits');
    assert.equal((options.headers as Record<string, string>)['Authorization'], 'Bearer agk_abc');
  });

  it('setToken() updates auth header', async () => {
    const aiWithoutKey = new AIGateway({ appId: 'app_123' });

    // Should throw if no token set
    await assert.rejects(
      async () => aiWithoutKey.credits(),
      /AIGateway: No API key or access token set/
    );

    aiWithoutKey.setToken('jwt_token_123');

    const fetchMock = mock.fn(async () => {
      return {
        json: async () => ({
          success: true,
          data: { balance: 100, planId: 'pro' },
        }),
      } as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await aiWithoutKey.credits();

    const callArgs = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
    const options = callArgs[1];
    assert.equal((options.headers as Record<string, string>)['Authorization'], 'Bearer jwt_token_123');
  });

  it('signIn() opens popup and resolves on postMessage', async () => {
    // Mock window and screen
    const windowMock = {
      screen: { width: 1920, height: 1080 },
      location: { origin: 'http://localhost:3000' },
      addEventListener: mock.fn(),
      removeEventListener: mock.fn(),
      open: mock.fn(() => ({ closed: false })),
    };

    global.window = windowMock as unknown as typeof window;

    // Start signIn promise
    const signInPromise = AIGateway.signIn({ appId: 'app_123' });

    // Ensure open was called
    assert.equal(windowMock.open.mock.calls.length, 1);
    const callArgs = windowMock.open.mock.calls[0].arguments as unknown as [string, string, string];
    const url = callArgs[0];
    const target = callArgs[1];
    // URL should include both appId and the caller's origin for secure postMessage targeting
    assert.ok(url.startsWith('https://app.ai-gateway.io/auth/popup?appId=app_123'));
    assert.ok(url.includes('origin='));
    assert.equal(target, 'ai-gateway-auth');

    // Find the message handler and call it
    const addEventListenerArgs = windowMock.addEventListener.mock.calls[0].arguments as unknown as [string, Function];
    const handleMessage = addEventListenerArgs[1];

    // Messages from a different origin must be ignored
    handleMessage({
      origin: 'https://evil.example.com',
      data: { type: 'AI_GATEWAY_AUTH', accessToken: 'stolen_token', user: {} }
    });

    // Simulate successful auth message from the correct popup origin
    handleMessage({
      origin: 'https://app.ai-gateway.io',
      data: {
        type: 'AI_GATEWAY_AUTH',
        accessToken: 'mock_access_token',
        user: { id: 'user_1', email: 'test@test.com', name: 'Test' }
      }
    });

    const result = await signInPromise;
    assert.equal(result.token, 'mock_access_token');
    assert.equal(result.user.name, 'Test');
  });

  it('stream() yields SSE data chunks', async () => {
    const ssePayload = 'data: chunk1\ndata: chunk2\ndata: [DONE]\n\n';
    const encoder = new TextEncoder();
    const encoded = encoder.encode(ssePayload);

    // Build a minimal ReadableStream that emits the SSE payload
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    });

    const fetchMock = mock.fn(async () => {
      return {
        ok: true,
        body: stream,
      } as unknown as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const chunks: string[] = [];
    for await (const chunk of ai.stream({ model: 'gpt-4o', messages: [{ role: 'user', content: 'Hi' }] })) {
      chunks.push(chunk);
    }

    assert.deepEqual(chunks, ['chunk1', 'chunk2']);

    // Verify request shape
    assert.equal(fetchMock.mock.calls.length, 1);
    const [reqUrl, reqInit] = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
    assert.equal(reqUrl, 'https://api.ai-gateway.io/api/v1/chat');
    const body = JSON.parse(reqInit.body as string);
    assert.equal(body.stream, true);
  });

  it('stream() throws on HTTP error', async () => {
    const fetchMock = mock.fn(async () => {
      return {
        ok: false,
        json: async () => ({ error: { message: 'Insufficient credits' } }),
      } as unknown as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await assert.rejects(
      async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _chunk of ai.stream({ model: 'gpt-4o', messages: [] })) { /* drain */ }
      },
      /AIGateway stream error: Insufficient credits/
    );
  });
});
