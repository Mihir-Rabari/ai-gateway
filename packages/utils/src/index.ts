import pino from 'pino';
import { randomUUID } from 'crypto';

// ─────────────────────────────────────────
// Logger
// ─────────────────────────────────────────

export const createLogger = (service: string) => {
  const transport =
    process.env['NODE_ENV'] === 'development'
      ? ({ target: 'pino-pretty', options: { colorize: true } } as const)
      : undefined;

  return pino({
    name: service,
    level: process.env['LOG_LEVEL'] ?? 'info',
    ...(transport ? { transport } : {}),
  });
};

export type Logger = ReturnType<typeof createLogger>;

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
