import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { AIGateway } from './index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a minimal fake JWT with the given payload (signature is not verified). */
function makeFakeJWT(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

const EXPIRED_TOKEN = makeFakeJWT({ userId: 'user-1', type: 'access', exp: 1 }); // expired 1970
const VALID_TOKEN = makeFakeJWT({ userId: 'user-1', type: 'access', exp: Math.floor(Date.now() / 1000) + 3600 });

describe('AIGateway SDK', () => {
  let ai: AIGateway;

  beforeEach(() => {
    // Backward-compat: appId + apiKey still works
    ai = new AIGateway({ appId: 'app_123', apiKey: 'agk_abc', clientId: 'app_123', redirectUri: 'http://localhost:3000/callback' });
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

  it('getCredits() is an alias for credits()', async () => {
    const fetchMock = mock.fn(async () => {
      return {
        json: async () => ({
          success: true,
          data: { balance: 80, planId: 'pro' },
        }),
      } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await ai.getCredits();
    assert.equal(result.balance, 80);
    assert.equal(result.planId, 'pro');
  });

  it('setToken() updates auth header', async () => {
    const aiWithoutKey = new AIGateway({ clientId: 'app_123', redirectUri: 'http://localhost:3000/callback' });

    // Should throw if no token set
    await assert.rejects(
      async () => aiWithoutKey.credits(),
      /AIGateway: No access token/
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

  it('handleCallback() exchanges code and stores tokens', async () => {
    const mockUser = { id: 'user_1', email: 'test@test.com', name: 'Test', planId: 'free' as const, creditBalance: 100 };
    const fetchMock = mock.fn(async () => {
      return {
        json: async () => ({
          success: true,
          data: {
            accessToken: 'access_tok',
            refreshToken: 'refresh_tok',
            user: mockUser,
          },
        }),
      } as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://auth.ai-gateway.io',
    });

    const callbackUrl = 'http://localhost:3000/callback?code=AUTH_CODE_123&state=some_state';
    const result = await oauthAi.handleCallback('client_secret_xyz', callbackUrl);

    assert.equal(result.accessToken, 'access_tok');
    assert.equal(result.refreshToken, 'refresh_tok');
    assert.equal(result.user.email, 'test@test.com');

    // Verify it called the token endpoint
    assert.equal(fetchMock.mock.calls.length, 1);
    const [reqUrl, reqInit] = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
    assert.equal(reqUrl, 'https://auth.ai-gateway.io/oauth/token');
    const body = JSON.parse(reqInit.body as string);
    assert.equal(body.client_id, 'client_abc');
    assert.equal(body.client_secret, 'client_secret_xyz');
    assert.equal(body.code, 'AUTH_CODE_123');
    assert.equal(body.redirect_uri, 'http://localhost:3000/callback');
    assert.equal(body.grant_type, 'authorization_code');
  });

  it('getSignInUrl() builds an OAuth authorize URL and stores state', async () => {
    const windowMock = {
      location: { href: 'http://localhost:3000', origin: 'http://localhost:3000' },
    };
    global.window = windowMock as unknown as typeof window;

    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://auth.ai-gateway.io/auth',
    });

    const signInUrl = await oauthAi.getSignInUrl();
    const parsed = new URL(signInUrl);

    assert.equal(parsed.origin, 'https://auth.ai-gateway.io');
    assert.equal(parsed.pathname, '/oauth/authorize');
    assert.equal(parsed.searchParams.get('client_id'), 'client_abc');
    assert.equal(parsed.searchParams.get('redirect_uri'), 'http://localhost:3000/callback');
    assert.equal(parsed.searchParams.get('response_type'), 'code');
    assert.ok(parsed.searchParams.get('state'));
  });

  it('handleCallback() throws on state mismatch', async () => {
    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
    });

    // Store a different state in storage
    // Access private storage via type casting for testing
    const storage = (oauthAi as unknown as { storage: { set: (k: string, v: string) => void } }).storage;
    storage.set('ai_gw_oauth_state', 'expected_state');

    const callbackUrl = 'http://localhost:3000/callback?code=CODE&state=wrong_state';
    await assert.rejects(
      async () => oauthAi.handleCallback('secret', callbackUrl),
      /state mismatch/
    );
  });

  it('handleCallback() throws when no code in URL', async () => {
    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
    });

    await assert.rejects(
      async () => oauthAi.handleCallback('secret', 'http://localhost:3000/callback?state=xyz'),
      /No authorization code/
    );
  });

  it('hasAuthCallback() detects code params', () => {
    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
    });

    assert.equal(oauthAi.hasAuthCallback('http://localhost:3000/callback?code=abc123'), true);
    assert.equal(oauthAi.hasAuthCallback('http://localhost:3000/callback'), false);
  });

  it('isAuthenticated() returns false when no token', async () => {
    const fresh = new AIGateway({ clientId: 'x', redirectUri: 'http://localhost/cb' });
    assert.equal(await fresh.isAuthenticated(), false);
  });

  it('isAuthenticated() returns true after setToken()', async () => {
    const fresh = new AIGateway({ clientId: 'x', redirectUri: 'http://localhost/cb' });
    fresh.setToken('tok');
    assert.equal(await fresh.isAuthenticated(), true);
  });

  it('refreshSession() exchanges the stored refresh token', async () => {
    const fetchMock = mock.fn(async () => {
      return {
        json: async () => ({
          success: true,
          data: {
            accessToken: 'new_access_tok',
            refreshToken: 'new_refresh_tok',
          },
        }),
      } as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://auth.ai-gateway.io',
    });

    const storage = (oauthAi as unknown as { storage: { set: (k: string, v: string) => void; get: (k: string) => string | null } }).storage;
    storage.set('ai_gw_refresh_token', 'refresh_123');

    const result = await oauthAi.refreshSession();

    assert.equal(result.accessToken, 'new_access_tok');
    assert.equal(result.refreshToken, 'new_refresh_tok');
    assert.equal(fetchMock.mock.calls.length, 1);
    const [reqUrl, reqInit] = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
    assert.equal(reqUrl, 'https://auth.ai-gateway.io/auth/refresh');
    assert.equal(JSON.parse(reqInit.body as string).refreshToken, 'refresh_123');
    assert.equal(storage.get('ai_gw_access_token'), 'new_access_tok');
  });

  it('signOut() calls the auth service logout endpoint', async () => {
    const fetchMock = mock.fn(async () => ({ ok: true }) as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://auth.ai-gateway.io',
    });
    const storage = (oauthAi as unknown as { storage: { set: (k: string, v: string) => void } }).storage;
    storage.set('ai_gw_access_token', 'access_123');

    await oauthAi.signOut();

    const [reqUrl, reqInit] = fetchMock.mock.calls[0].arguments as unknown as [string, RequestInit];
    assert.equal(reqUrl, 'https://auth.ai-gateway.io/auth/logout');
    assert.equal((reqInit.headers as Record<string, string>).Authorization, 'Bearer access_123');
  });

  it('signIn() opens popup and resolves on postMessage (static legacy)', async () => {
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

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-refresh and auto-logout behaviour
  // ─────────────────────────────────────────────────────────────────────────

  it('getAuthHeader auto-refreshes when access token is expired', async () => {
    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://auth.ai-gateway.io',
    });

    const storage = (oauthAi as unknown as { storage: { set: (k: string, v: string) => void; get: (k: string) => string | null } }).storage;
    storage.set('ai_gw_access_token', EXPIRED_TOKEN);
    storage.set('ai_gw_refresh_token', 'refresh_abc');

    // First call: refresh endpoint returns new tokens.
    // Second call: credits endpoint returns data.
    const fetchMock = mock.fn(async (url: string) => {
      if ((url as string).includes('/refresh')) {
        return {
          json: async () => ({
            success: true,
            data: { accessToken: VALID_TOKEN, refreshToken: 'new_refresh_abc' },
          }),
        } as unknown as Response;
      }
      return {
        json: async () => ({ success: true, data: { balance: 50, planId: 'free' } }),
      } as unknown as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await oauthAi.credits();

    // Should have called refresh endpoint then credits endpoint
    assert.equal(fetchMock.mock.calls.length, 2);
    const [refreshUrl] = fetchMock.mock.calls[0].arguments as unknown as [string];
    assert.ok(refreshUrl.includes('/refresh'), 'first call should be the refresh endpoint');

    // Credits response should be returned correctly
    assert.equal(result.balance, 50);

    // New access token should be stored
    assert.equal(storage.get('ai_gw_access_token'), VALID_TOKEN);

    // The credits request must have used the refreshed token in the Authorization header
    const [creditsUrl, creditsInit] = fetchMock.mock.calls[1].arguments as unknown as [string, RequestInit];
    assert.equal(creditsUrl, 'https://api.ai-gateway.io/api/v1/credits');
    assert.equal((creditsInit.headers as Record<string, string>)['Authorization'], `Bearer ${VALID_TOKEN}`);
  });

  it('getAuthHeader signs out and throws when both tokens are expired', async () => {
    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://auth.ai-gateway.io',
    });

    const storage = (oauthAi as unknown as { storage: { set: (k: string, v: string) => void; get: (k: string) => string | null } }).storage;
    storage.set('ai_gw_access_token', EXPIRED_TOKEN);
    storage.set('ai_gw_refresh_token', 'expired_refresh_tok');

    // Refresh endpoint returns an error
    const fetchMock = mock.fn(async () => {
      return {
        status: 401,
        json: async () => ({ success: false, error: { message: 'Refresh token expired' } }),
      } as unknown as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await assert.rejects(
      async () => oauthAi.credits(),
      /AIGateway: Session expired/
    );

    // Tokens should have been cleared (user signed out)
    assert.equal(storage.get('ai_gw_access_token'), null);
    assert.equal(storage.get('ai_gw_refresh_token'), null);
  });

  it('getAuthHeader signs out and throws when access token expired and no refresh token stored', async () => {
    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://auth.ai-gateway.io',
    });

    const storage = (oauthAi as unknown as { storage: { set: (k: string, v: string) => void; get: (k: string) => string | null } }).storage;
    storage.set('ai_gw_access_token', EXPIRED_TOKEN);
    // No refresh token stored

    const fetchMock = mock.fn(async () => ({ ok: true }) as Response);
    global.fetch = fetchMock as unknown as typeof fetch;

    await assert.rejects(
      async () => oauthAi.credits(),
      /AIGateway: Session expired/
    );

    // Access token should have been cleared
    assert.equal(storage.get('ai_gw_access_token'), null);
  });

  it('getAuthHeader does not refresh non-JWT legacy tokens (apiKey)', async () => {
    // ai fixture uses apiKey — it should bypass refresh logic entirely
    const fetchMock = mock.fn(async () => {
      return {
        json: async () => ({ success: true, data: { balance: 10, planId: 'free' } }),
      } as unknown as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await ai.credits();
    assert.equal(result.balance, 10);
    // Only one fetch call — no refresh was attempted
    assert.equal(fetchMock.mock.calls.length, 1);
  });

  it('getAuthHeader does not sign out on transient 5xx refresh failures', async () => {
    const oauthAi = new AIGateway({
      clientId: 'client_abc',
      redirectUri: 'http://localhost:3000/callback',
      authUrl: 'https://auth.ai-gateway.io',
    });

    const storage = (oauthAi as unknown as { storage: { set: (k: string, v: string) => void; get: (k: string) => string | null } }).storage;
    storage.set('ai_gw_access_token', EXPIRED_TOKEN);
    storage.set('ai_gw_refresh_token', 'refresh_abc');

    // Refresh endpoint returns a 500 server error
    const fetchMock = mock.fn(async () => {
      return {
        status: 500,
        json: async () => ({ success: false, error: { message: 'Internal Server Error' } }),
      } as unknown as Response;
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    await assert.rejects(
      async () => oauthAi.credits(),
      /Session refresh failed/,
    );

    // Tokens must NOT have been cleared — transient errors should not sign the user out
    assert.equal(storage.get('ai_gw_access_token'), EXPIRED_TOKEN);
    assert.equal(storage.get('ai_gw_refresh_token'), 'refresh_abc');
  });
});
