export interface AIGatewayConfig {
  appId: string;
  apiKey?: string;
  baseUrl?: string;
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

/**
 * AI Gateway SDK Client
 *
 * Initialize this class to interact with the AI Gateway.
 * It manages authentication, credit checks, and sending requests to AI models.
 */
export class AIGateway {
  private readonly appId: string;
  private readonly baseUrl: string;
  private apiKey: string | undefined;
  private accessToken: string | undefined;

  /**
   * Create a new AIGateway instance.
   *
   * @param config - The configuration options
   * @param config.appId - The developer's app ID registered with AI Gateway
   * @param config.apiKey - The user's API key (optional if using `signIn()`)
   * @param config.baseUrl - Override the default API URL
   */
  constructor(config: AIGatewayConfig) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.ai-gateway.io';
  }

  /**
   * Set the user's access token obtained via `signIn()`.
   *
   * @param token - The JWT access token
   */
  setToken(token: string): void {
    this.accessToken = token;
  }

  private getAuthHeader(): string {
    const token = this.accessToken ?? this.apiKey;
    if (!token) throw new Error('AIGateway: No API key or access token set. Call signIn() first.');
    return `Bearer ${token}`;
  }

  /**
   * Send a chat message to any AI model.
   *
   * @param options - Chat configuration
   * @param options.model - Model ID (e.g. 'gpt-4o', 'claude-3-5-sonnet')
   * @param options.messages - Conversation history
   * @param options.maxTokens - Maximum tokens to generate (default: 1024)
   * @param options.temperature - Sampling temperature (0-1)
   * @returns Chat result with output text and token/credit usage
   * @throws {Error} When insufficient credits or provider error
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
        Authorization: this.getAuthHeader(),
        'X-App-Id': this.appId,
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
   * @param options - Chat configuration (same as `chat()`)
   * @returns An async iterable that yields raw SSE data strings
   * @throws {Error} When insufficient credits, provider error, or network failure
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
        Authorization: this.getAuthHeader(),
        'X-App-Id': this.appId,
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
        // Parse Server-Sent Event lines — each SSE data line is prefixed with "data: "
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
   *
   * @returns The credit balance and plan ID
   * @throws {Error} If fetching credits fails
   */
  async credits(): Promise<CreditsResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/credits`, {
      headers: { Authorization: this.getAuthHeader() },
    });

    const json = await res.json() as { success: boolean; data?: CreditsResult };
    if (!json.success || !json.data) throw new Error('Failed to fetch credits');
    return json.data;
  }

  /**
   * Open a popup for the user to sign in with AI Gateway and authorize the app.
   *
   * @param options - Sign in options
   * @param options.appId - The developer's app ID registered with AI Gateway
   * @param options.popupUrl - The URL of the auth popup (optional)
   * @param options.width - Width of the popup window
   * @param options.height - Height of the popup window
   * @returns The user's access token and basic user info
   * @throws {Error} If the popup fails to open or is closed before signing in
   *
   * @example
   * const { token, user } = await AIGateway.signIn({ appId: 'app_123' });
   * ai.setToken(token);
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

    // Derive the expected message origin from the popup URL so we can strictly
    // validate inbound postMessages instead of using a fragile startsWith check.
    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(url).origin;
    } catch {
      throw new Error('AIGateway: Invalid popupUrl provided to signIn()');
    }

    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);

    // Pass our own origin so the popup can send the postMessage to the correct
    // target origin instead of using the insecure wildcard '*'.
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
      // Declare early so cleanup() can reference it.
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
        // Only accept messages from the popup's origin.
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

      // Detect if popup was closed without auth
      pollClosed = setInterval(() => {
        if (popup.closed) {
          cleanup();
          reject(new Error('AIGateway: Auth popup was closed'));
        }
      }, 500);
    });
  }
}
