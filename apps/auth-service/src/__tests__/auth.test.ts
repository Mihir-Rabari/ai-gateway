import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/authService.js';
import { UserRepository } from '../repositories/userRepository.js';
// Inline Redis mock (avoids cross-package import issues)
function createRedisMock() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, ..._args: unknown[]) => { store.set(key, value); return 'OK' as const; }),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => { store.set(key, value); return 'OK' as const; }),
    del: vi.fn(async (...keys: string[]) => { let n = 0; keys.forEach(k => { if (store.delete(k)) n++; }); return n; }),
    keys: vi.fn(async (pattern: string) => { const r = new RegExp(pattern.replace(/\*/g, '.*')); return [...store.keys()].filter(k => r.test(k)); }),
    scan: vi.fn(async (_cursor: string, ...args: unknown[]) => {
      const matchIdx = args.indexOf('MATCH');
      const pattern = matchIdx >= 0 ? args[matchIdx + 1] as string : '*';
      const r = new RegExp(String(pattern).replace(/\*/g, '.*'));
      const keys = [...store.keys()].filter(k => r.test(k));
      return ['0', keys] as [string, string[]];
    }),
    incr: vi.fn(async (key: string) => { const v = (parseInt(store.get(key) ?? '0') + 1).toString(); store.set(key, v); return parseInt(v); }),
    expire: vi.fn(async () => 1),
    eval: vi.fn(async () => 1),
    quit: vi.fn(async () => 'OK'),
  };
}

import jwt from 'jsonwebtoken';

const jwtMocked = vi.mocked(jwt, true);
const jwtSign = jwtMocked.sign;
const jwtVerify = jwtMocked.verify;

// ───────────────────────────────────────────────────────────────────────────
// Mocks for external dependencies
// ───────────────────────────────────────────────────────────────────────────

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockImplementation(
      async (plain: string, hash: string) =>
        plain === 'correct_password' && hash === 'hashed_password',
    ),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock_access_token'),
    verify: vi.fn().mockReturnValue({ userId: 'test-user-id', email: 'test@example.com', exp: 9999999999 }),
  },
}));

vi.mock('@ai-gateway/config', () => ({
  getAuthConfig: () => ({
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    RATE_LIMIT_MAX: 100,
    RATE_LIMIT_WINDOW_MS: 60000,
    AUTH_EVENTS_CONSUMER_ENABLED: false,
  }),
  KAFKA_TOPICS: {
    AUTH: 'auth.events',
    CREDIT: 'credit.events',
    BILLING: 'billing.events',
    USAGE: 'usage.events',
    ROUTING: 'routing.events',
    ANALYTICS: 'analytics.events',
  },
}));

// ───────────────────────────────────────────────────────────────────────────
// Fixtures
// ───────────────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: 'hashed_password',
  planId: 'free' as const,
  creditBalance: 100,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function makePgPool(queryMock: ReturnType<typeof vi.fn>): import('pg').Pool {
  return { query: queryMock } as unknown as import('pg').Pool;
}

// ───────────────────────────────────────────────────────────────────────────
// AuthService tests
// ───────────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let authService: AuthService;
  let redis: ReturnType<typeof createRedisMock>;
  let mockDbQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    redis = createRedisMock();
    mockDbQuery = vi.fn();
    authService = new AuthService(
      makePgPool(mockDbQuery),
      redis as unknown as import('ioredis').default,
    );

    jwtSign.mockImplementation((payload: { type: string }) => {
      if (payload.type === 'access') return 'mock_access_token';
      if (payload.type === 'refresh') return 'mock_refresh_token';
      return 'mock_token';
    });
    jwtVerify.mockImplementation((token: string) => {
      if (token === 'valid_access_token')
        return { userId: 'user-1', type: 'access', email: 'test@example.com', planId: 'free' };
      if (token === 'valid_refresh_token')
        return { userId: 'user-1', type: 'refresh', email: 'test@example.com', planId: 'free', jti: 'jti-1' };
      if (token === 'expired_token') {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      }
      throw new Error('invalid token');
    });
  });

  // ── Signup ─────────────────────────────────────────────────────────────

  describe('signup', () => {
    it('creates a user and returns tokens on valid input', async () => {
      mockDbQuery
        .mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [MOCK_USER], rowCount: 1 });

      const result = await authService.signup({
        email: 'TEST@example.com',
        name: 'Test User',
        password: 'correct_password',
      });

      expect(mockDbQuery).toHaveBeenCalledTimes(2);
      expect(mockDbQuery).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT EXISTS'),
        ['test@example.com'],
      );
      expect(result).toMatchObject({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User', planId: 'free', creditBalance: 100 },
      });
    });

    it('throws EMAIL_TAKEN (409) when email already exists', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });

      await expect(
        authService.signup({ email: 'test@example.com', name: 'Test', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'AUTH_005', statusCode: 409 });

      expect(mockDbQuery).toHaveBeenCalledTimes(1);
    });

    it('throws VALIDATION (400) for invalid email format', async () => {
      await expect(
        authService.signup({ email: 'not-an-email', name: 'Test', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 400 });
      expect(mockDbQuery).not.toHaveBeenCalled();
    });

    it('throws VALIDATION (400) for email with double dots', async () => {
      await expect(
        authService.signup({ email: 'test..dots@example.com', name: 'Test', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 400 });
    });

    it('throws VALIDATION (400) for email without TLD', async () => {
      await expect(
        authService.signup({ email: 'test@localhost', name: 'Test', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 400 });
    });

    it('throws VALIDATION (400) for weak password (< 8 chars)', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
      await expect(
        authService.signup({ email: 'test@example.com', name: 'Test', password: 'short' }),
      ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 400 });
    });

    it('throws VALIDATION (400) for overly long password (> 128 chars)', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
      await expect(
        authService.signup({ email: 'test@example.com', name: 'Test', password: 'x'.repeat(129) }),
      ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 400 });
    });
  });

  // ── Login ───────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [MOCK_USER], rowCount: 1 });

      const result = await authService.login({
        email: 'TEST@example.com',
        password: 'correct_password',
      });

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test@example.com'],
      );
      expect(result).toMatchObject({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        user: { id: 'user-1', email: 'test@example.com', planId: 'free' },
      });
    });

    it('throws INVALID_CREDENTIALS (401) for wrong password', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [MOCK_USER], rowCount: 1 });
      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong_password' }),
      ).rejects.toMatchObject({ code: 'AUTH_006', statusCode: 401 });
    });

    it('throws INVALID_CREDENTIALS (401) for nonexistent user', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(
        authService.login({ email: 'nobody@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'AUTH_006', statusCode: 401 });
    });

    it('throws VALIDATION (400) for invalid email format', async () => {
      await expect(
        authService.login({ email: 'not-an-email', password: 'password123' }),
      ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 400 });
      expect(mockDbQuery).not.toHaveBeenCalled();
    });
  });

  // ── Token validation ───────────────────────────────────────────────────

  describe('validateToken', () => {
    it('returns decoded payload for a valid, non-blacklisted token', async () => {
      const payload = await authService.validateToken('valid_access_token');
      expect(payload).toMatchObject({ userId: 'user-1', type: 'access' });
      expect(jwtVerify).toHaveBeenCalledWith('valid_access_token', 'access-secret');
    });

    it('throws TOKEN_EXPIRED (401) for expired token', async () => {
      await expect(authService.validateToken('expired_token')).rejects.toMatchObject({
        code: 'AUTH_002',
        statusCode: 401,
      });
    });

    it('throws INVALID_TOKEN (401) for unparseable token', async () => {
      await expect(authService.validateToken('garbage')).rejects.toMatchObject({
        code: 'AUTH_001',
        statusCode: 401,
      });
    });

    it('throws INVALID_TOKEN (401) when token is blacklisted in Redis', async () => {
      const token = 'valid_access_token';
      const blacklistKey = `blacklist:${token.slice(-16)}`;
      redis.set(blacklistKey, '1');

      await expect(authService.validateToken(token)).rejects.toMatchObject({
        code: 'AUTH_001',
        statusCode: 401,
      });
    });
  });

  // ── Logout ─────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears all refresh tokens for the user from Redis', async () => {
      redis.set('refresh:user-1:jti-a', 'data-a');
      redis.set('refresh:user-1:jti-b', 'data-b');
      redis.set('refresh:user-other:jti-c', 'data-c');

      await authService.logout('user-1');

      expect(await redis.get('refresh:user-1:jti-a')).toBeNull();
      expect(await redis.get('refresh:user-1:jti-b')).toBeNull();
      expect(await redis.get('refresh:user-other:jti-c')).not.toBeNull();
    });

    it('blacklists the access token with a positive TTL derived from exp', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = 'some.access.token';

      await authService.logout('user-1', token, futureExp);

      const blacklistKey = `blacklist:${token.slice(-16)}`;
      expect(await redis.get(blacklistKey)).toBe('1');
    });

    it('does not blacklist the access token when TTL is already expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 10;
      const token = 'expired.access.token';

      await authService.logout('user-1', token, pastExp);

      const blacklistKey = `blacklist:${token.slice(-16)}`;
      expect(await redis.get(blacklistKey)).toBeNull();
    });

    it('succeeds even when there are no refresh tokens to clear', async () => {
      await expect(authService.logout('user-1')).resolves.toBeUndefined();
    });
  });

  // ── Refresh ─────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('issues new tokens for a valid refresh token stored in Redis', async () => {
      redis.set(
        'refresh:user-1:jti-1',
        JSON.stringify({ userId: 'user-1', planId: 'free', issuedAt: 0 }),
      );
      mockDbQuery.mockResolvedValueOnce({ rows: [MOCK_USER], rowCount: 1 });

      const tokens = await authService.refresh('valid_refresh_token');

      expect(tokens).toMatchObject({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });
      expect(await redis.get('refresh:user-1:jti-1')).toBeNull();
    });

    it('throws TOKEN_EXPIRED when refresh token is not in Redis', async () => {
      await expect(authService.refresh('valid_refresh_token')).rejects.toMatchObject({
        code: 'AUTH_002',
        statusCode: 401,
      });
    });

    it('throws INVALID_TOKEN when the token type is not "refresh"', async () => {
      jwtVerify.mockReturnValueOnce({ userId: 'user-1', type: 'access', email: 't@e.com', planId: 'free' });
      await expect(authService.refresh('valid_refresh_token')).rejects.toMatchObject({
        code: 'AUTH_001',
        statusCode: 401,
      });
    });

    it('throws TOKEN_EXPIRED when jwt.verify fails entirely', async () => {
      jwtVerify.mockImplementationOnce(() => {
        throw new Error('bad signature');
      });
      await expect(authService.refresh('bad_token')).rejects.toMatchObject({
        code: 'AUTH_002',
        statusCode: 401,
      });
    });
  });

  // ── getMe ─────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('returns the user for a valid token', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [MOCK_USER], rowCount: 1 });
      const user = await authService.getMe('valid_access_token');
      expect(user).toMatchObject({ id: 'user-1', email: 'test@example.com' });
    });

    it('throws USER_NOT_FOUND when the user no longer exists', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(authService.getMe('valid_access_token')).rejects.toMatchObject({
        code: 'AUTH_004',
        statusCode: 404,
      });
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// UserRepository tests
// ───────────────────────────────────────────────────────────────────────────

describe('UserRepository', () => {
  let repo: UserRepository;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn();
    repo = new UserRepository(makePgPool(mockQuery));
  });

  it('findByEmail lowercases the email and returns the first row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER], rowCount: 1 });
    const user = await repo.findByEmail('TEST@EXAMPLE.COM');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM users WHERE email = $1'),
      ['test@example.com'],
    );
    expect(user).toEqual(MOCK_USER);
  });

  it('findByEmail returns null when no rows match', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.findByEmail('nobody@example.com')).toBeNull();
  });

  it('emailExists returns true when the DB reports existence', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });
    expect(await repo.emailExists('test@example.com')).toBe(true);
  });

  it('emailExists returns false when the DB reports non-existence', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });
    expect(await repo.emailExists('test@example.com')).toBe(false);
  });

  it('emailExists returns false on an empty result set', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await repo.emailExists('test@example.com')).toBe(false);
  });

  it('create inserts the user with a lowercased email and returns the row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_USER], rowCount: 1 });
    const user = await repo.create({
      id: 'new-id',
      email: 'NEW@EXAMPLE.COM',
      name: 'New',
      passwordHash: 'hash',
      planId: 'free',
      creditBalance: 100,
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['new-id', 'new@example.com', 'New', 'hash', 'free', 100],
    );
    expect(user).toEqual(MOCK_USER);
  });
});
