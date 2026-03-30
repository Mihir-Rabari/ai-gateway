import type {
  GatewayRequest,
  GatewayResponse,
  Message,
  AuthResult,
} from '@ai-gateway/types';

// ─────────────────────────────────────────
// Config
// ─────────────────────────────────────────

export interface AiGatewayConfig {
  /** Your registered app ID */
  appId: string;
  /** Your app API key from the developer dashboard */
  apiKey: string;
  /** Override the default gateway URL (for self-hosting) */
  baseUrl?: string;
}

// ─────────────────────────────────────────
// Request Options
// ─────────────────────────────────────────

export interface GenerateOptions {
  /** User's access token (obtained via Login with AI Gateway) */
  userToken: string;
  /** Model identifier e.g. 'gpt-4o', 'claude-3-5-sonnet-20241022' */
  model: string;
  /** Messages in OpenAI-compatible format */
  messages: Message[];
  /** Max tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0-1) */
  temperature?: number;
}

// ─────────────────────────────────────────
// Error
// ─────────────────────────────────────────

export class AiGatewayError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AiGatewayError';
  }
}

// ─────────────────────────────────────────
// SDK Client
// ─────────────────────────────────────────

export class AiGateway {
  private readonly baseUrl: string;
  private readonly appId: string;
  private readonly apiKey: string;

  constructor(config: AiGatewayConfig) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.aigateway.dev';
  }

  /**
   * Generate a text response using AI Gateway.
   * Credits are automatically deducted from the user's balance.
   *
   * @example
   * const response = await gateway.generate({
   *   userToken: accessToken,
   *   model: 'gpt-4o',
   *   messages: [{ role: 'user', content: 'Hello!' }]
   * });
   */
  async generate(options: GenerateOptions): Promise<GatewayResponse> {
    const response = await this.request<GatewayResponse>('/gateway/request', {
      method: 'POST',
      userToken: options.userToken,
      body: {
        model: options.model,
        messages: options.messages,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      } satisfies Omit<GatewayRequest, 'requestId' | 'userId' | 'appId'>,
    });
    return response;
  }

  /**
   * Get the list of available models
   */
  async getModels(): Promise<string[]> {
    const response = await this.request<{ models: string[] }>('/gateway/models', {
      method: 'GET',
    });
    return response.models;
  }

  // ─────────────────────────────────────────
  // Auth Helpers
  // ─────────────────────────────────────────

  /**
   * Get the URL to redirect the user to for "Login with AI Gateway"
   *
   * @example
   * const loginUrl = gateway.getLoginUrl('https://yourapp.com/callback');
   * window.location.href = loginUrl;
   */
  getLoginUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      appId: this.appId,
      redirectUri,
      responseType: 'code',
    });
    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange an authorization code for access + refresh tokens.
   * Call this on your /callback route after the user logs in.
   */
  async exchangeCode(code: string): Promise<AuthResult> {
    return this.request<AuthResult>('/auth/oauth/token', {
      method: 'POST',
      body: { code, appId: this.appId },
    });
  }

  /**
   * Refresh an expired access token using a refresh token.
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    return this.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  }

  // ─────────────────────────────────────────
  // Internal HTTP Client
  // ─────────────────────────────────────────

  private async request<T>(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      userToken?: string;
    },
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-app-id': this.appId,
      'x-api-key': this.apiKey,
    };

    if (options.userToken) {
      headers['Authorization'] = `Bearer ${options.userToken}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const json = (await response.json()) as { success: boolean; data?: T; error?: { code: string; message: string } };

    if (!json.success || !response.ok) {
      throw new AiGatewayError(
        json.error?.code ?? 'UNKNOWN',
        json.error?.message ?? 'Unknown error',
        response.status,
      );
    }

    return json.data as T;
  }
}

// Named exports for tree-shaking
export type { GatewayResponse, Message, AuthResult };
