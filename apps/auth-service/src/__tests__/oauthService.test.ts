import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OAuthService } from '../services/oauthService.js';

// ─── Mock pg Pool ───────────────────────────────────────────────────────────

const mockPgQuery = vi.fn();
const mockPgPool = {
  query: mockPgQuery,
} as unknown as import('pg').Pool;

// ─── Mock Redis ──────────────────────────────────────────────────────────────

const mockRedisGet = vi.fn();
const mockRedisSetex = vi.fn();
const mockRedisDel = vi.fn();
const mockRedisKeys = vi.fn();

const mockRedis = {
  get: mockRedisGet,
  setex: mockRedisSetex,
  del: mockRedisDel,
  keys: mockRedisKeys,
} as unknown as import('ioredis').default;

// ─── Mock bcrypt ─────────────────────────────────────────────────────────────

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    // Default: correct_password + hashed_password → true; everything else → false
    compare: vi.fn().mockImplementation(
      async (plain: string, hash: string) =>
        plain === 'correct_password' && hash === 'hashed_password',
    ),
  },
}));

// ─── Mock config ──────────────────────────────────────────────────────────────

vi.mock('@ai-gateway/config', () => ({
  getAuthConfig: vi.fn(() => ({
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    RATE_LIMIT_MAX: 100,
    RATE_LIMIT_WINDOW_MS: 60000,
    AUTH_SERVICE_PORT: 3003,
    NODE_ENV: 'test',
    AUTH_EVENTS_CONSUMER_ENABLED: false,
  })),
}));

// ─── Mock jsonwebtoken ────────────────────────────────────────────────────────

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockImplementation(
      (payload: { type?: string }) => {
        if (payload.type === 'access') return 'mock_access_token';
        if (payload.type === 'refresh') return 'mock_refresh_token';
        return 'mock_token';
      },
    ),
    verify: vi.fn().mockImplementation((token: string) => {
      if (token === 'valid_access_token') {
        return { userId: 'user-1', type: 'access', email: 'test@example.com' };
      }
      throw new Error('invalid token');
    }),
  },
}));

// ─── Shared test data ─────────────────────────────────────────────────────────

// Raw DB row as returned by the SQL query (aliases applied by AS clauses)
const MOCK_APP_ROW = {
  id: 'app-1',
  developer_id: 'dev-1',
  name: 'Test App',
  client_id: 'client_abc',
  client_secret_hash: 'hashed_secret',
  redirect_uris: JSON.stringify(['https://example.com/callback']),
};

// UserRecord as returned from userRepository (SQL aliases produce camelCase keys)
const MOCK_USER_RECORD = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  planId: 'free' as const,
  creditBalance: 100,
  passwordHash: 'hashed_password',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OAuthService', () => {
  let service: OAuthService;

  beforeEach(() => {
    // Reset call history AND pending mockResolvedValueOnce queues on individual mocks.
    // vi.clearAllMocks() does not flush the once-queues, so we use mockReset() on each
    // mock function to prevent unconsumed return values from leaking between tests.
    mockPgQuery.mockReset();
    mockRedisGet.mockReset();
    mockRedisSetex.mockReset();
    mockRedisDel.mockReset();
    mockRedisKeys.mockReset();

    service = new OAuthService(mockPgPool, mockRedis);
  });

  // ── validateAuthorizeRequest ──────────────────────────────────────────────

  describe('validateAuthorizeRequest()', () => {
    it('returns appName when params are valid', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });

      const result = await service.validateAuthorizeRequest({
        clientId: 'client_abc',
        redirectUri: 'https://example.com/callback',
        responseType: 'code',
      });

      expect(result.appName).toBe('Test App');
    });

    it('throws OAUTH_006 when clientId is missing', async () => {
      await expect(
        service.validateAuthorizeRequest({
          clientId: '',
          redirectUri: 'https://example.com/callback',
          responseType: 'code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_006' });
    });

    it('throws OAUTH_006 when redirectUri is missing', async () => {
      await expect(
        service.validateAuthorizeRequest({
          clientId: 'client_abc',
          redirectUri: '',
          responseType: 'code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_006' });
    });

    it('throws OAUTH_004 for unsupported response_type', async () => {
      await expect(
        service.validateAuthorizeRequest({
          clientId: 'client_abc',
          redirectUri: 'https://example.com/callback',
          responseType: 'token',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_004' });
    });

    it('throws OAUTH_001 when client is not found', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.validateAuthorizeRequest({
          clientId: 'unknown_client',
          redirectUri: 'https://example.com/callback',
          responseType: 'code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_001' });
    });

    it('throws OAUTH_002 when redirect_uri is not registered', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });

      await expect(
        service.validateAuthorizeRequest({
          clientId: 'client_abc',
          redirectUri: 'https://evil.example.com/callback',
          responseType: 'code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_002' });
    });
  });

  // ── authorizeUser ─────────────────────────────────────────────────────────

  describe('authorizeUser()', () => {
    it('authenticates user and returns a redirect URL with code and state', async () => {
      // oauthRepo.findAppByClientId
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });
      // authService.login → userRepo.findByEmail
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_USER_RECORD] });
      // authService.login → issueTokens → redis.setex (refresh token)
      mockRedisSetex.mockResolvedValueOnce('OK');
      // oauthRepo.storeAuthCode → redis.setex (auth code)
      mockRedisSetex.mockResolvedValueOnce('OK');

      const { redirectUrl } = await service.authorizeUser({
        clientId: 'client_abc',
        redirectUri: 'https://example.com/callback',
        scope: 'basic',
        state: 'csrf_state_xyz',
        email: 'user@example.com',
        password: 'correct_password',
      });

      const parsed = new URL(redirectUrl);
      expect(parsed.origin + parsed.pathname).toBe('https://example.com/callback');
      expect(parsed.searchParams.get('state')).toBe('csrf_state_xyz');
      expect(parsed.searchParams.get('code')).toBeTruthy();
    });

    it('throws OAUTH_001 when client is not found', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.authorizeUser({
          clientId: 'unknown_client',
          redirectUri: 'https://example.com/callback',
          scope: 'basic',
          state: '',
          email: 'user@example.com',
          password: 'correct_password',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_001' });
    });

    it('throws OAUTH_002 when redirect_uri does not match', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });

      await expect(
        service.authorizeUser({
          clientId: 'client_abc',
          redirectUri: 'https://attacker.example.com/callback',
          scope: 'basic',
          state: '',
          email: 'user@example.com',
          password: 'correct_password',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_002' });
    });

    it('propagates auth error on wrong credentials', async () => {
      // findAppByClientId → valid app
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });
      // userRepo.findByEmail → found, but bcrypt.compare will return false
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_USER_RECORD] });

      const bcrypt = await import('bcrypt');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as never);

      await expect(
        service.authorizeUser({
          clientId: 'client_abc',
          redirectUri: 'https://example.com/callback',
          scope: 'basic',
          state: '',
          email: 'user@example.com',
          password: 'wrong_password',
        }),
      ).rejects.toBeDefined();
    });
  });

  // ── exchangeToken ─────────────────────────────────────────────────────────

  describe('exchangeToken()', () => {
    it('exchanges a valid code for access + refresh tokens', async () => {
      // oauthRepo.findAppByClientId
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });
      // bcrypt.compare: valid client secret
      const bcrypt = await import('bcrypt');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(true as never);
      // oauthRepo.consumeAuthCode → redis.get
      mockRedisGet.mockResolvedValueOnce(
        JSON.stringify({
          clientId: 'client_abc',
          userId: 'user-1',
          redirectUri: 'https://example.com/callback',
          scope: 'basic',
        }),
      );
      // oauthRepo.consumeAuthCode → redis.del
      mockRedisDel.mockResolvedValueOnce(1);
      // authService.getUserById → userRepo.findById
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_USER_RECORD] });
      // authService.issueTokensForUser → userRepo.findById (used by issueTokens)
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_USER_RECORD] });
      // authService.issueTokens → redis.setex (refresh token)
      mockRedisSetex.mockResolvedValueOnce('OK');

      const result = await service.exchangeToken({
        clientId: 'client_abc',
        clientSecret: 'correct_password',
        code: 'valid_auth_code',
        redirectUri: 'https://example.com/callback',
        grantType: 'authorization_code',
      });

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBe('mock_refresh_token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(15 * 60);
      expect(result.user.email).toBe('user@example.com');
    });

    it('throws OAUTH_005 for unsupported grant_type', async () => {
      await expect(
        service.exchangeToken({
          clientId: 'client_abc',
          clientSecret: 'secret',
          code: 'code',
          redirectUri: 'https://example.com/callback',
          grantType: 'client_credentials',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_005' });
    });

    it('throws OAUTH_001 when client is not found', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.exchangeToken({
          clientId: 'unknown_client',
          clientSecret: 'secret',
          code: 'code',
          redirectUri: 'https://example.com/callback',
          grantType: 'authorization_code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_001' });
    });

    it('throws OAUTH_001 when client secret does not match', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });

      const bcrypt = await import('bcrypt');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as never);

      await expect(
        service.exchangeToken({
          clientId: 'client_abc',
          clientSecret: 'wrong_secret',
          code: 'code',
          redirectUri: 'https://example.com/callback',
          grantType: 'authorization_code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_001' });
    });

    it('throws OAUTH_003 when auth code is missing or expired', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });
      const bcrypt = await import('bcrypt');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(true as never);
      // consumeAuthCode returns null (code not found / expired)
      mockRedisGet.mockResolvedValueOnce(null);

      await expect(
        service.exchangeToken({
          clientId: 'client_abc',
          clientSecret: 'correct_password',
          code: 'expired_code',
          redirectUri: 'https://example.com/callback',
          grantType: 'authorization_code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_003' });
    });

    it('throws OAUTH_003 when code belongs to a different client', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });
      const bcrypt = await import('bcrypt');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(true as never);
      // consumeAuthCode returns data with a different clientId
      mockRedisGet.mockResolvedValueOnce(
        JSON.stringify({
          clientId: 'client_other',
          userId: 'user-1',
          redirectUri: 'https://example.com/callback',
          scope: 'basic',
        }),
      );
      mockRedisDel.mockResolvedValueOnce(1);

      await expect(
        service.exchangeToken({
          clientId: 'client_abc',
          clientSecret: 'correct_password',
          code: 'stolen_code',
          redirectUri: 'https://example.com/callback',
          grantType: 'authorization_code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_003' });
    });

    it('throws OAUTH_003 when redirect_uri does not match code', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW] });
      const bcrypt = await import('bcrypt');
      vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(true as never);
      // consumeAuthCode returns data with the original redirect URI
      mockRedisGet.mockResolvedValueOnce(
        JSON.stringify({
          clientId: 'client_abc',
          userId: 'user-1',
          redirectUri: 'https://example.com/callback',
          scope: 'basic',
        }),
      );
      mockRedisDel.mockResolvedValueOnce(1);

      await expect(
        service.exchangeToken({
          clientId: 'client_abc',
          clientSecret: 'correct_password',
          code: 'valid_code',
          // Mismatch: caller passes a different URI than what was stored in the code
          redirectUri: 'https://example.com/different-callback',
          grantType: 'authorization_code',
        }),
      ).rejects.toMatchObject({ code: 'OAUTH_003' });
    });
  });
});
