import { createHash, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from 'crypto';
import { createLogger, Errors, GatewayError } from '@ai-gateway/utils';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { CodexDeviceCodeResponse, CodexOAuthSession } from '@ai-gateway/types';
import type { Pool } from 'pg';
import type Redis from 'ioredis';

const logger = createLogger('codex-oauth-service');

// ─────────────────────────────────────────
// Constants
// ─────────────────────────────────────────

const CODEX_CLIENT_ID = process.env['CODEX_CLIENT_ID'] ?? 'codex-cli';
const CODEX_AUTH_BASE_URL = process.env['CODEX_AUTH_BASE_URL'] ?? 'https://auth.openai.com';
const CODEX_API_BASE_URL = process.env['CODEX_API_BASE_URL'] ?? 'https://chatgpt.com/backend-api/codex';
const TOKEN_REFRESH_MARGIN_MS = (Number(process.env['CODEX_TOKEN_REFRESH_MARGIN_SECONDS']) || 300) * 1000;

// Encryption key for storing tokens (32 bytes hex)
const ENCRYPTION_KEY = process.env['CLIENT_SECRET_ENCRYPTION_KEY'] ?? '';
const ENCRYPTION_KEY_BUF = Buffer.from(ENCRYPTION_KEY, 'hex');

// ─────────────────────────────────────────
// Simple AES-256-GCM encrypt/decrypt for token storage
// ─────────────────────────────────────────

function encryptToken(plaintext: string): string {
  if (!ENCRYPTION_KEY_BUF.length || ENCRYPTION_KEY_BUF.length !== 32) {
    throw new GatewayError('CODEX_ENC_001', 'Encryption key not configured or invalid', 500);
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY_BUF, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptToken(encrypted: string): string {
  if (!ENCRYPTION_KEY_BUF.length || ENCRYPTION_KEY_BUF.length !== 32) {
    throw new GatewayError('CODEX_ENC_002', 'Encryption key not configured or invalid', 500);
  }
  const parts = encrypted.split(':');
  if (parts.length !== 3) throw new GatewayError('CODEX_ENC_003', 'Invalid encrypted token format', 500);
  const iv = Buffer.from(parts[0]!, 'hex');
  const authTag = Buffer.from(parts[1]!, 'hex');
  const data = parts[2]!;
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY_BUF, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ─────────────────────────────────────────
// Errors
// ─────────────────────────────────────────

export const CodexErrors = {
  NOT_AUTHENTICATED: () =>
    new GatewayError('CODEX_AUTH_001', 'ChatGPT account not linked. Sign in with ChatGPT first.', 401),
  TOKEN_EXPIRED: () =>
    new GatewayError('CODEX_AUTH_002', 'ChatGPT session expired. Please re-authenticate.', 401),
  DEVICE_CODE_FAILED: () =>
    new GatewayError('CODEX_AUTH_003', 'Failed to start device-code login flow', 502),
  POLL_FAILED: () =>
    new GatewayError('CODEX_AUTH_004', 'Device-code authorization polling failed', 502),
  TOKEN_REFRESH_FAILED: () =>
    new GatewayError('CODEX_AUTH_005', 'Failed to refresh ChatGPT OAuth token', 502),
  API_ERROR: (msg: string) =>
    new GatewayError('CODEX_API_001', `Codex API error: ${msg}`, 502),
};

// ─────────────────────────────────────────
// CodexOAuthService
// ─────────────────────────────────────────

export class CodexOAuthService {
  constructor(
    private readonly db: Pool,
    private readonly redis: Redis,
    private readonly kafkaPublish: (topic: string, msg: object) => Promise<void>,
  ) {}

  // ─── Device-Code Login Flow ──────────────────────────────────────

  /**
   * Step 1: Request a device code from OpenAI's auth endpoint.
   * Returns the user_code and device_auth_id for polling.
   * The verification URL is a fixed OpenAI page: https://auth.openai.com/codex/device
   */
  async requestDeviceCode(): Promise<{
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    interval: number;
  }> {
    const res = await fetch(`${CODEX_AUTH_BASE_URL}/api/accounts/deviceauth/usercode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CODEX_CLIENT_ID, scope: 'openid profile email' }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Failed to request device code from OpenAI');
      throw CodexErrors.DEVICE_CODE_FAILED();
    }

    const data = (await res.json()) as CodexDeviceCodeResponse;
    return {
      deviceCode: data.device_auth_id,
      userCode: data.user_code,
      verificationUri: `${CODEX_AUTH_BASE_URL}/codex/device`,
      interval: Number(data.interval),
    };
  }

  /**
   * Step 2: Poll for device-code authorization completion.
   * Returns OAuth tokens when the user completes sign-in in their browser.
   */
  async pollDeviceCode(deviceCode: string, interval: number, timeoutMs = 300_000): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    idToken?: string;
  }> {
    const startTime = Date.now();
    const pollIntervalMs = Math.max(interval * 1000, 2000);

    // We need the user_code paired with this device_auth_id for polling.
    // It was stored in Redis by the route handler alongside the userId.
    const storedUserCode = await this.redis.get(`codex:device:usercode:${deviceCode}`);
    if (!storedUserCode) {
      throw CodexErrors.DEVICE_CODE_FAILED();
    }

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const res = await fetch(`${CODEX_AUTH_BASE_URL}/api/accounts/deviceauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CODEX_CLIENT_ID,
          device_auth_id: deviceCode,
          user_code: storedUserCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      if (res.status === 400 || res.status === 403) {
        const body = (await res.json()) as { error?: { code?: string } };
        const errorCode = body.error?.code;
        if (errorCode === 'deviceauth_authorization_pending') continue; // user hasn't approved yet
        if (errorCode === 'deviceauth_slow_down') {
          // Increase polling interval per OAuth spec
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          continue;
        }
        if (errorCode === 'deviceauth_expired_token') throw CodexErrors.DEVICE_CODE_FAILED();
        if (errorCode === 'deviceauth_access_denied') throw CodexErrors.DEVICE_CODE_FAILED();
        continue;
      }

      if (!res.ok) {
        logger.warn({ status: res.status }, 'Device-code polling failed');
        throw CodexErrors.POLL_FAILED();
      }

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        id_token?: string;
      };

      // Clean up the stored user_code
      await this.redis.del(`codex:device:usercode:${deviceCode}`);

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        idToken: data.id_token,
      };
    }

    throw CodexErrors.DEVICE_CODE_FAILED();
  }

  // ─── Token Management ────────────────────────────────────────────

  /**
   * Store encrypted OAuth tokens for a user.
   */
  async storeSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    accountId?: string,
  ): Promise<void> {
    const encryptedAccess = encryptToken(accessToken);
    const encryptedRefresh = encryptToken(refreshToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.db.query(
      `INSERT INTO codex_oauth_sessions (user_id, access_token, refresh_token, expires_at, account_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET access_token = $2, refresh_token = $3, expires_at = $4, account_id = $5`,
      [userId, encryptedAccess, encryptedRefresh, expiresAt, accountId],
    );

    void this.kafkaPublish('codex.events', {
      eventId: randomBytes(16).toString('hex'),
      topic: 'codex.events',
      type: 'codex.session.created',
      userId,
      timestamp: new Date().toISOString(),
      version: '1.0',
    });

    logger.info({ userId }, 'Codex OAuth session stored');
  }

  /**
   * Get a valid (possibly refreshed) access token for a user.
   * Automatically refreshes if the token is close to expiry.
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const session = await this.getSession(userId);
    if (!session) throw CodexErrors.NOT_AUTHENTICATED();

    // Check if token needs refresh (within margin of expiry)
    const expiresAt = new Date(session.expires_at).getTime();
    if (Date.now() + TOKEN_REFRESH_MARGIN_MS >= expiresAt) {
      return this.refreshAndGetToken(userId, session.refresh_token);
    }

    return decryptToken(session.access_token);
  }

  /**
   * Refresh the OAuth tokens using the refresh token.
   */
  private async refreshAndGetToken(userId: string, encryptedRefreshToken: string): Promise<string> {
    const refreshToken = decryptToken(encryptedRefreshToken);

    const res = await fetch(`${CODEX_AUTH_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CODEX_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      logger.warn({ userId, status: res.status }, 'Token refresh failed');
      throw CodexErrors.TOKEN_REFRESH_FAILED();
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const newRefreshToken = data.refresh_token ?? refreshToken;
    await this.storeSession(userId, data.access_token, newRefreshToken, data.expires_in);

    return data.access_token;
  }

  /**
   * Remove a user's Codex session (logout).
   */
  async deleteSession(userId: string): Promise<void> {
    await this.db.query('DELETE FROM codex_oauth_sessions WHERE user_id = $1', [userId]);
    logger.info({ userId }, 'Codex OAuth session deleted');
  }

  /**
   * Check if a user has an active Codex session.
   */
  async hasSession(userId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT 1 FROM codex_oauth_sessions WHERE user_id = $1 AND expires_at > NOW()',
      [userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get session info for a user (without exposing tokens).
   */
  async getSessionInfo(userId: string): Promise<{
    hasSession: boolean;
    planTier?: string;
    accountId?: string;
    expiresAt?: string;
  } | null> {
    const session = await this.getSession(userId);
    if (!session) return { hasSession: false };
    return {
      hasSession: true,
      planTier: session.plan_tier ?? undefined,
      accountId: session.account_id ?? undefined,
      expiresAt: session.expires_at instanceof Date
        ? session.expires_at.toISOString()
        : new Date(session.expires_at).toISOString(),
    };
  }

  // ─── LLM Proxy (call Codex API) ──────────────────────────────────

  /**
   * Call the Codex API with a user's OAuth token.
   * This is the main method routing-service will use.
   */
  async callCodexAPI(
    userId: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    options?: { maxTokens?: number; temperature?: number; stream?: boolean },
  ): Promise<{
    output: string;
    tokensInput: number;
    tokensOutput: number;
    tokensTotal: number;
  } | AsyncIterable<string>> {
    const accessToken = await this.getValidAccessToken(userId);

    const body: Record<string, unknown> = {
      model,
      input: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
    };

    if (options?.stream) {
      body.stream = true;
      return this.streamResponse(accessToken, body);
    }

    const res = await fetch(`${CODEX_API_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'OpenAI-Beta': 'responses=v1',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn({ status: res.status, body: text }, 'Codex API call failed');
      if (res.status === 401) throw CodexErrors.TOKEN_EXPIRED();
      throw CodexErrors.API_ERROR(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      output_text?: string;
      usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
    };

    return {
      output: data.output_text ?? '',
      tokensInput: data.usage?.input_tokens ?? 0,
      tokensOutput: data.usage?.output_tokens ?? 0,
      tokensTotal: data.usage?.total_tokens ?? 0,
    };
  }

  private async *streamResponse(
    accessToken: string,
    body: Record<string, unknown>,
  ): AsyncIterable<string> {
    const res = await fetch(`${CODEX_API_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'OpenAI-Beta': 'responses=v1',
      },
      body: JSON.stringify({ ...body, stream: true }),
    });

    if (!res.ok || !res.body) {
      throw CodexErrors.API_ERROR(`Stream HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            yield `data: [DONE]\n\n`;
            return;
          }

          try {
            const parsed = JSON.parse(payload) as {
              type?: string;
              delta?: { text?: string };
              output_text?: string;
              usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
            };

            // Forward the event as-is
            yield `data: ${JSON.stringify(parsed)}\n\n`;

            // Also emit usage as our own event if it has usage data
            if (parsed.usage) {
              yield `data: ${JSON.stringify({
                usage: {
                  tokensInput: parsed.usage.input_tokens,
                  tokensOutput: parsed.usage.output_tokens,
                  tokensTotal: parsed.usage.total_tokens,
                },
                provider: 'codex',
              })}\n\n`;
            }
          } catch {
            // Forward raw
            yield `${trimmed}\n\n`;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private async getSession(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_at: Date | string;
    plan_tier?: string;
    account_id?: string;
  } | null> {
    const result = await this.db.query(
      `SELECT access_token, refresh_token, expires_at, plan_tier, account_id
       FROM codex_oauth_sessions WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }
}
