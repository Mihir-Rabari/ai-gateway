import pino from 'pino';
import {
  randomUUID,
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

// ─────────────────────────────────────────
// Logger
// ─────────────────────────────────────────

const getLogTransport = () =>
  process.env['NODE_ENV'] === 'development'
    ? ({ target: 'pino-pretty', options: { colorize: true } } as const)
    : undefined;

export const createLogger = (service: string) => {
  const transport = getLogTransport();

  return pino({
    name: service,
    level: process.env['LOG_LEVEL'] ?? 'info',
    ...(transport ? { transport } : {}),
  });
};

export type Logger = ReturnType<typeof createLogger>;

/**
 * Returns standardized pino logger options for use with Fastify's `logger` option.
 * Use this instead of inline logger configs to ensure consistent logging across all services.
 *
 * @example
 * const app = Fastify({ logger: getFastifyLoggerOptions() });
 */
export const getFastifyLoggerOptions = () => {
  const transport = getLogTransport();

  return {
    level: process.env['LOG_LEVEL'] ?? 'info',
    ...(transport ? { transport } : {}),
  };
};

// ─────────────────────────────────────────
// ID Generation
// ─────────────────────────────────────────

export const generateId = (): string => randomUUID();

// ─────────────────────────────────────────
// Error Classes
// ─────────────────────────────────────────

export class GatewayError extends Error {
  override readonly message: string;

  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.message = message;
    this.name = 'GatewayError';
  }
}

export const Errors = {
  // Auth
  INVALID_TOKEN: () =>
    new GatewayError('AUTH_001', 'Invalid or missing token', 401),
  TOKEN_EXPIRED: () =>
    new GatewayError('AUTH_002', 'Token has expired', 401),
  FORBIDDEN: () =>
    new GatewayError('AUTH_003', 'Insufficient permissions', 403),
  USER_NOT_FOUND: () =>
    new GatewayError('AUTH_004', 'User not found', 404),
  EMAIL_TAKEN: () =>
    new GatewayError('AUTH_005', 'Email already in use', 409),
  INVALID_CREDENTIALS: () =>
    new GatewayError('AUTH_006', 'Invalid email or password', 401),

  // Credits
  INSUFFICIENT_CREDITS: (balance: number, required: number) =>
    new GatewayError(
      'CREDIT_001',
      `Insufficient credits. Balance: ${balance}, Required: ${required}`,
      402,
    ),
  CREDIT_LOCK_FAILED: () =>
    new GatewayError('CREDIT_002', 'Failed to lock credits, please retry', 503),

  // Gateway
  PROVIDER_ERROR: (details?: unknown) =>
    new GatewayError('GATEWAY_001', 'AI provider returned an error', 502, details),
  ROUTING_FAILED: () =>
    new GatewayError('GATEWAY_002', 'Failed to route request to any provider', 503),
  INVALID_APP_KEY: () =>
    new GatewayError('GATEWAY_000', 'Invalid app API key', 401),

  // General
  NOT_FOUND: (resource: string) =>
    new GatewayError('NOT_FOUND', `${resource} not found`, 404),
  INTERNAL: () =>
    new GatewayError('INTERNAL', 'Internal server error', 500),
  VALIDATION: (message: string) =>
    new GatewayError('VALIDATION', message, 400),
};

// ─────────────────────────────────────────
// Response Helpers (inline types to avoid circular dep)
// ─────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}

export const ok = <T>(data: T): ApiSuccess<T> => ({
  success: true,
  data,
});

export const fail = (error: GatewayError): ApiError => ({
  success: false,
  error: {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
  },
});

// ─────────────────────────────────────────
// Async Helpers
// ─────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 500,
): Promise<T> => {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) await sleep(delayMs * attempt);
    }
  }
  throw lastError;
};

// ─────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidUUID = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

// ─────────────────────────────────────────
// Credit Calculation
// ─────────────────────────────────────────

const CREDITS_PER_1K_TOKENS: Record<string, number> = {
  'gpt-4o': 10,
  'gpt-4-turbo': 8,
  'gpt-3.5-turbo': 1,
  'claude-3-5-sonnet-20241022': 12,
  'claude-3-haiku-20240307': 2,
  'gemini-1.5-pro': 8,
  'gemini-1.5-flash': 1,
};

export const calculateCredits = (model: string, tokens: number): number => {
  const rate = CREDITS_PER_1K_TOKENS[model] ?? 5;
  return Math.ceil((tokens / 1000) * rate);
};

// ─────────────────────────────────────────
// Client Secret Encryption (AES-256-GCM)
// ─────────────────────────────────────────

const AES_ALGO = 'aes-256-gcm' as const;

/**
 * Encrypt a client secret for storage using AES-256-GCM.
 *
 * @param plaintext - The raw client secret string
 * @param keyHex   - 32-byte key as a 64-char hex string
 * @returns `<iv_hex>:<tag_hex>:<ciphertext_hex>` — safe to store in the database
 */
export function encryptClientSecret(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

/**
 * Decrypt a client secret that was encrypted with {@link encryptClientSecret}.
 *
 * @param encStr - The stored `<iv_hex>:<tag_hex>:<ciphertext_hex>` string
 * @param keyHex - 32-byte key as a 64-char hex string
 * @returns The original plaintext secret
 * @throws If the format is invalid or the authentication tag does not match
 */
export function decryptClientSecret(encStr: string, keyHex: string): string {
  const parts = encStr.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');
  const [ivHex, tagHex, ctHex] = parts as [string, string, string];
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const decipher = createDecipheriv(AES_ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

// ─────────────────────────────────────────
// App JWT Verification (HS256)
// ─────────────────────────────────────────

export interface AppJwtPayload {
  clientId: string;
  iat: number;
  exp: number;
}

/**
 * Verify an HS256 JWT that a developer's app signs with its client secret.
 *
 * Uses constant-time comparison to prevent timing-based side-channel attacks.
 *
 * @param token  - The `X-App-Token` JWT string
 * @param secret - The raw (decrypted) client secret used as the HMAC key
 * @returns The decoded payload
 * @throws If the signature is invalid or the token has expired
 */
export function verifyAppJwt(token: string, secret: string): AppJwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');

  const actualBuf = Buffer.from(sigB64, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    throw new Error('Invalid JWT signature');
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf8'),
  ) as AppJwtPayload;

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expired');
  }

  return payload;
}

// ─────────────────────────────────────────
// Shared Fastify Plugins
// ─────────────────────────────────────────

export { postgresPlugin } from './plugins/postgres.js';
export { redisPlugin } from './plugins/redis.js';
export { kafkaPlugin } from './plugins/kafka.js';
export { errorHandlerPlugin } from './plugins/errorHandler.js';
export { securityHeadersPlugin } from './plugins/securityHeaders.js';
