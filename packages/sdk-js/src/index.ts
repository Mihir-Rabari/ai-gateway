// ─────────────────────────────────────────────────────────────────────────────
// Token Storage abstraction
// Allows developers to plug in their own persistence (e.g. localStorage, DB).
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenStorage {
  get(key: string): string | null | Promise<string | null>;
  set(key: string, value: string): void | Promise<void>;
  remove(key: string): void | Promise<void>;
}

/** Default in-memory storage (cleared on page reload). */
class MemoryStorage implements TokenStorage {
  private readonly store = new Map<string, string>();
  get(key: string) { return this.store.get(key) ?? null; }
  set(key: string, value: string) { this.store.set(key, value); }
  remove(key: string) { this.store.delete(key); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export interface AIGatewayConfig {
  /** OAuth clientId obtained after registering an app. */
  clientId: string;
  /** The redirect URI registered with AI Gateway (must match exactly). */
  redirectUri: string;
  /** Base URL of the AI Gateway API. Defaults to https://api.ai-gateway.io */
  baseUrl?: string;
  /** Base URL of the AI Gateway Auth service. Defaults to https://auth.ai-gateway.io */
  authUrl?: string;
  /** Custom token persistence layer. Defaults to in-memory. */
  storage?: TokenStorage;

  // ── Legacy / API-key mode ──
  /** @deprecated Use clientId + redirectUri OAuth flow instead */
  appId?: string;
  /** @deprecated Use signIn() OAuth flow instead */
  apiKey?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  requestId: string;
  output: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  creditsUsed: number;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface CreditsResult {
  balance: number;
  planId: 'free' | 'pro' | 'max';
}

export interface UserResult {
  id: string;
  email: string;
  name: string;
  planId: 'free' | 'pro' | 'max';
  creditBalance: number;
}

export interface SignInResult {
  accessToken: string;
  refreshToken: string;
  user: UserResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ai_gw_access_token',
  REFRESH_TOKEN: 'ai_gw_refresh_token',
  OAUTH_STATE: 'ai_gw_oauth_state',
  USER: 'ai_gw_user',
} as const;

/**
 * AI Gateway SDK Client
 *
 * Implements a Google OAuth-style authentication and AI request pipeline.
 *
 * ## Quick Start (OAuth flow)
 * ```ts
 * const ai = new AIGateway({ clientId: 'client_xxx', redirectUri: 'http://localhost:3000/callback' });
 * await ai.signIn();            // redirects browser to consent page
 * // --- after redirect back ---
 * await ai.handleCallback();    // exchanges code, stores tokens
 * const result = await ai.chat({ model: 'gpt-4o', messages: [{ role: 'user', content: 'Hi' }] });
 * ```
 */
export class AIGateway {
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly baseUrl: string;
  private readonly authUrl: string;
  private readonly storage: TokenStorage;

  // Legacy API-key mode
  /** @deprecated */
  private readonly appId: string;
  /** @deprecated */
  private apiKey: string | undefined;
  /** @deprecated – use storage instead */
  private legacyAccessToken: string | undefined;

  /**
   * Create a new AIGateway instance.
   *
   * @param config.clientId  - OAuth clientId obtained from the developer console
   * @param config.redirectUri - Redirect URI registered with AI Gateway
   * @param config.baseUrl   - Override the API base URL
   * @param config.authUrl   - Override the auth service URL
   * @param config.storage   - Custom token storage (default: in-memory)
   */
  constructor(config: AIGatewayConfig) {
    const clientId = config.clientId ?? config.appId ?? '';
    if (!clientId) {
      throw new Error('AIGateway: clientId (or appId) is required');
    }
    this.clientId = clientId;
    this.redirectUri = config.redirectUri ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.ai-gateway.io';
    this.authUrl = config.authUrl ?? 'https://auth.ai-gateway.io';
    this.storage = config.storage ?? new MemoryStorage();
    // Keep legacy appId only when explicitly provided, don't conflate with clientId
    this.appId = config.appId ?? '';
    this.apiKey = config.apiKey;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auth — OAuth flow
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Redirect the user's browser to the AI Gateway sign-in page.
   *
   * The browser will be redirected to `redirectUri?code=...&state=...` after login.
   * Call `handleCallback()` on that page to exchange the code for tokens.
   *
   * @throws {Error} If running outside a browser environment
   */
  async signIn(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('AIGateway.signIn() can only be called in a browser environment');
    }
    if (!this.clientId) {
      throw new Error('AIGateway: clientId is required for signIn()');
    }
    if (!this.redirectUri) {
      throw new Error('AIGateway: redirectUri is required for signIn()');
    }

    const state = this.generateState();
    await this.storage.set(STORAGE_KEYS.OAUTH_STATE, state);

    const url = new URL(`${this.authUrl}/oauth/authorize`);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'basic');
    url.searchParams.set('state', state);

    window.location.href = url.toString();
  }

  /**
   * Handle the OAuth callback on the redirect URI page.
   *
   * Parses `code` and `state` from the current URL, validates the state to
   * prevent CSRF, exchanges the code for access + refresh tokens, and stores them.
   *
   * @param clientSecret - Your app's clientSecret (kept server-side in production)
   * @param url - The callback URL to parse (defaults to `window.location.href`)
   * @returns User and tokens after successful exchange
   * @throws {Error} On state mismatch, missing code, or token exchange failure
   */
  async handleCallback(clientSecret: string, url?: string): Promise<SignInResult> {
    const href = url ?? (typeof window !== 'undefined' ? window.location.href : '');
    const params = new URL(href).searchParams;

    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      throw new Error('AIGateway: No authorization code found in callback URL');
    }

    const storedState = await this.storage.get(STORAGE_KEYS.OAUTH_STATE);
    if (state && storedState && state !== storedState) {
      throw new Error('AIGateway: OAuth state mismatch — possible CSRF attack');
    }
    await this.storage.remove(STORAGE_KEYS.OAUTH_STATE);

    const result = await this.exchangeCode(code, clientSecret);

    await this.storage.set(STORAGE_KEYS.ACCESS_TOKEN, result.accessToken);
    await this.storage.set(STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
    await this.storage.set(STORAGE_KEYS.USER, JSON.stringify(result.user));

    return result;
  }

  /**
   * Clear all stored tokens and sign the user out.
   */
  async signOut(): Promise<void> {
    // Capture the token before clearing so we can call the server logout endpoint
    const token = await this.storage.get(STORAGE_KEYS.ACCESS_TOKEN) ?? this.legacyAccessToken;

    await this.storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
    await this.storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    await this.storage.remove(STORAGE_KEYS.USER);
    this.legacyAccessToken = undefined;

    // Best-effort server logout (ignore errors)
    try {
      if (token) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* ignore */ }
  }

  /**
   * Get the currently authenticated user's profile.
   *
   * @returns User profile, or null if not signed in
   */
  async getUser(): Promise<UserResult | null> {
    const cached = await this.storage.get(STORAGE_KEYS.USER);
    if (cached) {
      try {
        return JSON.parse(cached) as UserResult;
      } catch { /* fall through to API */ }
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/v1/me`, {
        headers: { Authorization: await this.getAuthHeader() },
      });
      if (!res.ok) return null;
      const json = await res.json() as { success: boolean; data?: UserResult };
      if (!json.success || !json.data) return null;
      await this.storage.set(STORAGE_KEYS.USER, JSON.stringify(json.data));
      return json.data;
    } catch {
      return null;
    }
  }

  /**
   * Check if a user is currently authenticated.
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.storage.get(STORAGE_KEYS.ACCESS_TOKEN);
    return !!(token || this.legacyAccessToken || this.apiKey);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auth — Legacy / token helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Manually set an access token (e.g., received from your own backend).
   * @deprecated Prefer the OAuth `signIn()` → `handleCallback()` flow.
   */
  setToken(token: string): void {
    this.legacyAccessToken = token;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AI Requests
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send a chat message to any AI model.
   *
   * @param options.model    - Model ID (e.g. 'gpt-4o', 'claude-3-5-sonnet')
   * @param options.messages - Conversation history
   * @param options.maxTokens - Maximum tokens to generate (default: 1024)
   * @param options.temperature - Sampling temperature (0–1)
   * @returns Chat result with output text and token/credit usage
   *
   * @example
   * const result = await ai.chat({
   *   model: 'gpt-4o',
   *   messages: [{ role: 'user', content: 'What is TypeScript?' }],
   * });
   */
  async chat(options: ChatOptions): Promise<ChatResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: await this.getAuthHeader(),
        'X-App-Id': this.clientId || this.appId,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    const json = await res.json() as { success: boolean; data?: ChatResult & { creditsDeducted?: number }; error?: { message: string } };

    if (!json.success || !json.data) {
      throw new Error(`AIGateway chat error: ${json.error?.message ?? 'Unknown error'}`);
    }

    return {
      ...json.data,
      creditsUsed: json.data.creditsDeducted ?? json.data.creditsUsed,
    } as ChatResult;
  }

  /**
   * Stream a chat response token-by-token using Server-Sent Events.
   *
   * @param options - Same as `chat()`
   * @returns An async iterable yielding raw SSE data strings
   *
   * @example
   * for await (const chunk of ai.stream({ model: 'gpt-4o', messages: [...] })) {
   *   process.stdout.write(chunk);
   * }
   */
  async *stream(options: ChatOptions): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: await this.getAuthHeader(),
        'X-App-Id': this.clientId || this.appId,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        stream: true,
      }),
    });

    if (!res.ok) {
      let message = 'Unknown error';
      try {
        const json = await res.json() as { error?: { message: string } };
        message = json.error?.message ?? message;
      } catch { /* ignore parse errors */ }
      throw new Error(`AIGateway stream error: ${message}`);
    }

    if (!res.body) {
      throw new Error('AIGateway: No response body for streaming');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim();
            if (payload && payload !== '[DONE]') {
              yield payload;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get the current user's credit balance and plan.
   */
  async getCredits(): Promise<CreditsResult> {
    return this.credits();
  }

  /**
   * Get the current user's credit balance and plan.
   * @alias getCredits
   */
  async credits(): Promise<CreditsResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/credits`, {
      headers: { Authorization: await this.getAuthHeader() },
    });

    const json = await res.json() as { success: boolean; data?: CreditsResult };
    if (!json.success || !json.data) throw new Error('Failed to fetch credits');
    return json.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async getAuthHeader(): Promise<string> {
    const stored = await this.storage.get(STORAGE_KEYS.ACCESS_TOKEN);
    const token = stored ?? this.legacyAccessToken ?? this.apiKey;
    if (!token) throw new Error('AIGateway: No access token. Call signIn() and handleCallback() first.');
    return `Bearer ${token}`;
  }

  private generateState(): string {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error('AIGateway: Web Crypto API is required for CSRF state generation. Use a modern browser or Node.js 15+.');
    }
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Exchange an authorization code for tokens (server-side step).
   * In a production app, call this from your backend to keep clientSecret safe.
   */
  private async exchangeCode(code: string, clientSecret: string): Promise<SignInResult> {
    const res = await fetch(`${this.authUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const json = await res.json() as {
      success: boolean;
      data?: { accessToken: string; refreshToken: string; user: UserResult };
      error?: { message: string };
    };

    if (!json.success || !json.data) {
      throw new Error(`AIGateway: Token exchange failed — ${json.error?.message ?? 'Unknown error'}`);
    }

    return {
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
      user: json.data.user,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Legacy static sign-in (popup-based, kept for backward compatibility)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @deprecated Use the instance `signIn()` + `handleCallback()` OAuth flow.
   *
   * Opens a popup for the user to sign in with AI Gateway.
   */
  static async signIn(options: {
    appId: string;
    popupUrl?: string;
    width?: number;
    height?: number;
  }): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
    const url = options.popupUrl ?? 'https://app.ai-gateway.io/auth/popup';
    const width = options.width ?? 420;
    const height = options.height ?? 560;

    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(url).origin;
    } catch {
      throw new Error('AIGateway: Invalid popupUrl provided to signIn()');
    }

    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);

    const popupSrc = `${url}?appId=${encodeURIComponent(options.appId)}&origin=${encodeURIComponent(window.location.origin)}`;

    const popup = window.open(
      popupSrc,
      'ai-gateway-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no`
    );

    if (!popup) {
      throw new Error('AIGateway: Could not open auth popup. Check if popups are blocked.');
    }

    return new Promise((resolve, reject) => {
      let pollClosed: ReturnType<typeof setInterval>;

      const timeout = setTimeout(() => {
        reject(new Error('AIGateway: Auth timed out (2 minutes)'));
        cleanup();
      }, 2 * 60 * 1000);

      function cleanup() {
        clearTimeout(timeout);
        clearInterval(pollClosed);
        window.removeEventListener('message', handleMessage);
      }

      function handleMessage(event: MessageEvent) {
        if (event.origin !== expectedOrigin) return;

        const data = event.data as { type?: string; accessToken?: string; user?: unknown };
        if (data.type === 'AI_GATEWAY_AUTH' && data.accessToken) {
          cleanup();
          resolve({
            token: data.accessToken,
            user: data.user as { id: string; email: string; name: string }
          });
        }
      }

      window.addEventListener('message', handleMessage);

      pollClosed = setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error('AIGateway: Auth popup was closed'));
        }
      }, 500);
    });
  }
}
