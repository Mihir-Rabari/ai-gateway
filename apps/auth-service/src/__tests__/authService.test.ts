import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../services/authService.js';
import { Errors } from '@ai-gateway/utils';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// --- Mocks ---

const mockPgQuery = vi.fn();
const mockPgPool = {
  query: mockPgQuery,
} as unknown as import('pg').Pool;

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

// Mock dependencies that are not easily stubbed by overriding the class instance
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockImplementation((plain, hash) => plain === 'correct_password' && hash === 'hashed_password'),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockImplementation((payload, secret, options) => {
      if (payload.type === 'access') return 'mock_access_token';
      if (payload.type === 'refresh') return 'mock_refresh_token';
      return 'mock_token';
    }),
    verify: vi.fn().mockImplementation((token, secret) => {
      if (token === 'valid_access_token') {
        return { userId: 'user-1', type: 'access', email: 'test@example.com' };
      }
      if (token === 'valid_refresh_token') {
        return { userId: 'user-1', type: 'refresh', email: 'test@example.com', jti: 'jti-1' };
      }
      if (token === 'expired_token') {
        const err = new Error('jwt expired');
        err.name = 'TokenExpiredError';
        throw err;
      }
      throw new Error('invalid token');
    }),
  },
}));

// Mock config module
vi.mock('@ai-gateway/config', () => ({
  getAuthConfig: () => ({
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  }),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(mockPgPool, mockRedis);
  });

  describe('signup', () => {
    it('should create a user and return tokens', async () => {
      // Mock email check - does not exist
      mockPgQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });

      // Mock create user
      const mockUser = {
        id: randomUUID(),
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed_password',
        planId: 'free',
        creditBalance: 100,
      };
      mockPgQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.signup({
        email: 'TEST@example.com', // testing normalization
        name: 'Test User',
        password: 'correct_password',
      });

      expect(mockPgQuery).toHaveBeenCalledTimes(2);
      expect(mockRedisSetex).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(result.user).toHaveProperty('email', 'test@example.com');
      expect(result.user).toHaveProperty('planId', 'free');
    });

    it('should throw EMAIL_TAKEN if email exists', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });

      await expect(
        authService.signup({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
        }),
      ).rejects.toThrow(Errors.EMAIL_TAKEN());
    });

    it('should throw VALIDATION if password is too short', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [{ exists: false }] });

      await expect(
        authService.signup({
          email: 'test@example.com',
          name: 'Test User',
          password: 'short',
        }),
      ).rejects.toThrow(Errors.VALIDATION('Password must be at least 8 characters'));
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Mock find user
      mockPgQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          planId: 'free',
          creditBalance: 100,
        }],
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'correct_password',
      });

      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(result.user).toHaveProperty('email', 'test@example.com');
    });

    it('should throw INVALID_CREDENTIALS for wrong password', async () => {
      mockPgQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          planId: 'free',
          creditBalance: 100,
        }],
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong_password',
        }),
      ).rejects.toThrow(Errors.INVALID_CREDENTIALS());
    });

    it('should throw INVALID_CREDENTIALS if user not found', async () => {
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(Errors.INVALID_CREDENTIALS());
    });
  });

  describe('refresh', () => {
    it('should issue new tokens for a valid refresh token', async () => {
      // Mock redis get (token exists)
      mockRedisGet.mockResolvedValueOnce('{"userId":"user-1","planId":"free","issuedAt":123}');

      // Mock find user
      mockPgQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          passwordHash: 'hashed_password',
          planId: 'free',
          creditBalance: 100,
        }],
      });

      const result = await authService.refresh('valid_refresh_token');

      expect(mockRedisGet).toHaveBeenCalled();
      expect(mockRedisDel).toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
    });

    it('should throw TOKEN_EXPIRED if refresh token is expired', async () => {
      await expect(authService.refresh('expired_token')).rejects.toThrow(Errors.TOKEN_EXPIRED());
    });

    it('should throw TOKEN_EXPIRED if refresh token not in Redis', async () => {
      mockRedisGet.mockResolvedValueOnce(null);

      await expect(authService.refresh('valid_refresh_token')).rejects.toThrow(Errors.TOKEN_EXPIRED());
    });
  });

  describe('getMe', () => {
    it('should return user info for a valid token', async () => {
      // Mock validateToken internally via Redis (not blacklisted)
      mockRedisGet.mockResolvedValueOnce(null);

      // Mock user find
      mockPgQuery.mockResolvedValueOnce({
        rows: [{
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          passwordHash: 'hashed_password',
          planId: 'free',
          creditBalance: 100,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
      });

      const user = await authService.getMe('valid_access_token');
      expect(user).toHaveProperty('id', 'user-1');
      expect(user).toHaveProperty('email', 'test@example.com');
      expect(user).toHaveProperty('name', 'Test User');
      expect(user).toHaveProperty('planId', 'free');
    });

    it('should throw USER_NOT_FOUND if user is missing', async () => {
      mockRedisGet.mockResolvedValueOnce(null);
      mockPgQuery.mockResolvedValueOnce({ rows: [] });

      await expect(authService.getMe('valid_access_token')).rejects.toThrow(Errors.USER_NOT_FOUND());
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid access token', async () => {
      mockRedisGet.mockResolvedValueOnce(null); // not blacklisted

      const result = await authService.validateToken('valid_access_token');

      expect(result).toHaveProperty('userId', 'user-1');
      expect(result).toHaveProperty('type', 'access');
    });

    it('should throw INVALID_TOKEN if token is blacklisted', async () => {
      mockRedisGet.mockResolvedValueOnce('blacklisted');

      await expect(authService.validateToken('valid_access_token')).rejects.toThrow(Errors.INVALID_TOKEN());
    });

    it('should throw TOKEN_EXPIRED for expired token', async () => {
      await expect(authService.validateToken('expired_token')).rejects.toThrow(Errors.TOKEN_EXPIRED());
    });
  });
});
