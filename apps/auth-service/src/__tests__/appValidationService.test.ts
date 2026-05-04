import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppValidationService } from '../services/appValidationService.js';
import { AppRepository } from '../repositories/appRepository.js';

// ─── Mock AppRepository ────────────────────────────────────────────────────────

const mockFindClientSecretEnc = vi.fn();
const mockFindApiKeyHashes = vi.fn();
const mockIsAppActive = vi.fn();

const mockAppRepo = {
  findClientSecretEncByClientId: mockFindClientSecretEnc,
  findApiKeyHashesByAppId: mockFindApiKeyHashes,
  isAppActive: mockIsAppActive,
} as unknown as AppRepository;

// ─── Mock Redis ──────────────────────────────────────────────────────────────

const mockRedisGet = vi.fn();
const mockRedisSetex = vi.fn();
const mockRedisDel = vi.fn();

const mockRedis = {
  get: mockRedisGet,
  setex: mockRedisSetex,
  del: mockRedisDel,
} as unknown as import('ioredis').default;

// ─── Mock @ai-gateway/config ──────────────────────────────────────────────────

vi.mock('@ai-gateway/config', () => ({
  APP_CACHE_KEYS: {
    activeStatus: (appId: string) => `app:active:${appId}`,
    apiKeyHashes: (appId: string) => `app:apikeys:${appId}`,
    clientSecret: (clientId: string) => `app:clientid:${clientId}:secret_enc`,
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesignature`;
}

beforeEach(() => {
  vi.resetAllMocks();
  // Default: Redis returns null (cache miss)
  mockRedisGet.mockResolvedValue(null);
  mockRedisSetex.mockResolvedValue('OK');
  mockRedisDel.mockResolvedValue(1);
  // Default: app not active (safe default for tests that don't set it explicitly)
  mockIsAppActive.mockResolvedValue(false);
});

describe('AppValidationService', () => {
  // ─── Active-status path (no API key, no JWT) ────────────────────────────────

  describe('active-status validation', () => {
    it('returns allowed for an active app', async () => {
      mockIsAppActive.mockResolvedValue(true);

      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined);
      const result = await svc.validate('app-1');

      expect(result).toBe('allowed');
      expect(mockIsAppActive).toHaveBeenCalledWith('app-1');
    });

    it('returns forbidden for an inactive app', async () => {
      mockIsAppActive.mockResolvedValue(false);

      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined);
      const result = await svc.validate('app-inactive');

      expect(result).toBe('forbidden');
    });

    it('returns allowed from Redis cache without querying DB', async () => {
      mockRedisGet.mockResolvedValue('1');

      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined);
      const result = await svc.validate('app-cached');

      expect(result).toBe('allowed');
      expect(mockIsAppActive).not.toHaveBeenCalled();
    });

    it('returns forbidden from Redis cache without querying DB', async () => {
      mockRedisGet.mockResolvedValue('0');

      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined);
      const result = await svc.validate('app-cached-inactive');

      expect(result).toBe('forbidden');
      expect(mockIsAppActive).not.toHaveBeenCalled();
    });

    it('caches the active-status result in Redis after a DB lookup', async () => {
      mockIsAppActive.mockResolvedValue(true);

      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined);
      await svc.validate('app-new');

      expect(mockRedisSetex).toHaveBeenCalledWith('app:active:app-new', expect.any(Number), '1');
    });

    it('falls back to DB when Redis.get throws', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis unavailable'));
      mockIsAppActive.mockResolvedValue(true);

      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined);
      const result = await svc.validate('app-redis-fail');

      expect(result).toBe('allowed');
      expect(mockIsAppActive).toHaveBeenCalledWith('app-redis-fail');
    });
  });

  // ─── API-key validation ─────────────────────────────────────────────────────

  describe('API-key validation', () => {
    it('returns allowed when the provided key matches a stored hash', async () => {
      mockFindApiKeyHashes.mockResolvedValue(['hashed-key']);

      const compareHash = vi.fn().mockResolvedValue(true);
      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined, { compareHash });
      const result = await svc.validate('app-1', 'raw-key');

      expect(result).toBe('allowed');
    });

    it('returns invalid_key when no hash matches', async () => {
      mockFindApiKeyHashes.mockResolvedValue(['hashed-key']);

      const compareHash = vi.fn().mockResolvedValue(false);
      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined, { compareHash });
      const result = await svc.validate('app-1', 'wrong-key');

      expect(result).toBe('invalid_key');
    });

    it('serves key hashes from Redis cache on second call, skipping DB', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(['hashed-key']));

      const compareHash = vi.fn().mockResolvedValue(true);
      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined, { compareHash });
      const result = await svc.validate('app-cached-keys', 'raw-key');

      expect(result).toBe('allowed');
      expect(mockFindApiKeyHashes).not.toHaveBeenCalled();
    });

    it('evicts a malformed Redis entry and re-fetches from DB', async () => {
      mockRedisGet.mockResolvedValue('{not valid json}');
      mockFindApiKeyHashes.mockResolvedValue(['hashed-key']);

      const compareHash = vi.fn().mockResolvedValue(true);
      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined, { compareHash });
      const result = await svc.validate('app-bad-cache', 'raw-key');

      expect(result).toBe('allowed');
      expect(mockRedisDel).toHaveBeenCalledWith('app:apikeys:app-bad-cache');
      expect(mockFindApiKeyHashes).toHaveBeenCalledWith('app-bad-cache');
    });

    it('falls back to DB when Redis.get throws for key-hash lookup', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis unavailable'));
      mockFindApiKeyHashes.mockResolvedValue(['hashed-key']);

      const compareHash = vi.fn().mockResolvedValue(true);
      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined, { compareHash });
      const result = await svc.validate('app-1', 'raw-key');

      expect(result).toBe('allowed');
      expect(mockFindApiKeyHashes).toHaveBeenCalledWith('app-1');
    });
  });

  // ─── JWT validation ─────────────────────────────────────────────────────────

  describe('JWT validation', () => {
    const ENC_KEY = 'a'.repeat(64);

    it('returns allowed when the JWT is valid and client secret decrypts successfully', async () => {
      mockFindClientSecretEnc.mockResolvedValue('enc-secret');

      const decryptSecret = vi.fn().mockReturnValue('decrypted-secret');
      const verifyJwt = vi.fn().mockReturnValue({ clientId: 'client-1', iat: 0, exp: 9999999999 });

      const svc = new AppValidationService(mockAppRepo, mockRedis, ENC_KEY, { decryptSecret, verifyJwt });
      const jwt = makeJwt({ clientId: 'client-1', iat: 0, exp: 9999999999 });
      const result = await svc.validate('app-1', undefined, jwt);

      expect(result).toBe('allowed');
      expect(decryptSecret).toHaveBeenCalledWith('enc-secret', ENC_KEY);
      expect(verifyJwt).toHaveBeenCalledWith(jwt, 'decrypted-secret');
    });

    it('returns invalid_key when verifyJwt throws', async () => {
      mockFindClientSecretEnc.mockResolvedValue('enc-secret');

      const decryptSecret = vi.fn().mockReturnValue('decrypted-secret');
      const verifyJwt = vi.fn().mockImplementation(() => { throw new Error('Invalid signature'); });

      const svc = new AppValidationService(mockAppRepo, mockRedis, ENC_KEY, { decryptSecret, verifyJwt });
      const jwt = makeJwt({ clientId: 'client-1' });
      const result = await svc.validate('app-1', undefined, jwt);

      expect(result).toBe('invalid_key');
    });

    it('falls through to active-status check when client secret is not found in DB', async () => {
      mockFindClientSecretEnc.mockResolvedValue(null);
      mockIsAppActive.mockResolvedValue(false); // falls through to active status → forbidden

      const svc = new AppValidationService(mockAppRepo, mockRedis, ENC_KEY, {
        decryptSecret: vi.fn(),
        verifyJwt: vi.fn(),
      });
      const jwt = makeJwt({ clientId: 'unknown-client' });
      const result = await svc.validate('app-1', undefined, jwt);

      // JWT path finds no enc secret → falls through to active status check
      expect(result).toBe('forbidden');
    });

    it('returns invalid_key for a malformed JWT (wrong number of parts)', async () => {
      const svc = new AppValidationService(mockAppRepo, mockRedis, ENC_KEY, {});
      const result = await svc.validate('app-1', undefined, 'not.a.valid.jwt.parts');

      expect(result).toBe('invalid_key');
    });

    it('serves encrypted secret from Redis cache, skipping DB', async () => {
      mockRedisGet.mockResolvedValue('cached-enc-secret');

      const decryptSecret = vi.fn().mockReturnValue('decrypted-secret');
      const verifyJwt = vi.fn().mockReturnValue({ clientId: 'client-1', iat: 0, exp: 9999999999 });

      const svc = new AppValidationService(mockAppRepo, mockRedis, ENC_KEY, { decryptSecret, verifyJwt });
      const jwt = makeJwt({ clientId: 'client-1' });
      await svc.validate('app-1', undefined, jwt);

      expect(mockFindClientSecretEnc).not.toHaveBeenCalled();
      expect(decryptSecret).toHaveBeenCalledWith('cached-enc-secret', ENC_KEY);
    });

    it('falls through to API-key path when no encryption key is configured', async () => {
      mockFindApiKeyHashes.mockResolvedValue(['hashed-key']);
      const compareHash = vi.fn().mockResolvedValue(true);

      // No encryption key → JWT path is skipped
      const svc = new AppValidationService(mockAppRepo, mockRedis, undefined, { compareHash });
      const jwt = makeJwt({ clientId: 'client-1' });
      const result = await svc.validate('app-1', 'raw-key', jwt);

      expect(result).toBe('allowed');
      expect(mockFindApiKeyHashes).toHaveBeenCalled();
    });
  });
});
