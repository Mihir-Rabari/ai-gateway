import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import type Redis from 'ioredis';
import type { Pool } from 'pg';
import { getAuthConfig } from '@ai-gateway/config';
import { Errors, generateId } from '@ai-gateway/utils';
import type { AuthResult, TokenPayload } from '@ai-gateway/types';
import { UserRepository } from '../repositories/userRepository.js';

const config = getAuthConfig();
const BCRYPT_ROUNDS = 12;

export class AuthService {
  private readonly userRepo: UserRepository;

  constructor(
    private readonly db: Pool,
    private readonly redis: Redis,
  ) {
    this.userRepo = new UserRepository(db);
  }

  // ─────────────────────────────────────────
  // Signup
  // ─────────────────────────────────────────

  async signup(data: {
    email: string;
    name: string;
    password: string;
  }): Promise<AuthResult> {
    const normalizedEmail = data.email.toLowerCase().trim();

    const exists = await this.userRepo.emailExists(normalizedEmail);
    if (exists) throw Errors.EMAIL_TAKEN();

    if (data.password.length < 8) throw Errors.VALIDATION('Password must be at least 8 characters');
    if (data.password.length > 128) throw Errors.VALIDATION('Password too long');

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = await this.userRepo.create({
      id: generateId(),
      email: normalizedEmail,
      name: data.name,
      passwordHash,
      planId: 'free',
      creditBalance: 100,
    });

    const tokens = await this.issueTokens(user.id, user.email, user.planId);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planId: user.planId,
        creditBalance: user.creditBalance,
      },
    };
  }

  // ─────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────

  async login(data: { email: string; password: string }): Promise<AuthResult> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) throw Errors.INVALID_CREDENTIALS();

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) throw Errors.INVALID_CREDENTIALS();

    const tokens = await this.issueTokens(user.id, user.email, user.planId);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planId: user.planId,
        creditBalance: user.creditBalance,
      },
    };
  }

  // ─────────────────────────────────────────
  // Refresh Token
  // ─────────────────────────────────────────

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: TokenPayload & { jti?: string };
    try {
      payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as TokenPayload & { jti?: string };
    } catch {
      throw Errors.TOKEN_EXPIRED();
    }

    if (payload.type !== 'refresh') throw Errors.INVALID_TOKEN();

    const redisKey = `refresh:${payload.userId}:${payload.jti ?? ''}`;
    const stored = await this.redis.get(redisKey);
    if (!stored) throw Errors.TOKEN_EXPIRED();

    await this.redis.del(redisKey);

    const user = await this.userRepo.findById(payload.userId);
    if (!user) throw Errors.USER_NOT_FOUND();

    return this.issueTokens(user.id, user.email, user.planId);
  }

  // ─────────────────────────────────────────
  // Get Me
  // ─────────────────────────────────────────

  async getMe(token: string) {
    const payload = await this.validateToken(token);
    return this.getUserById(payload.userId);
  }

  async getUserById(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw Errors.USER_NOT_FOUND();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      planId: user.planId,
      creditBalance: user.creditBalance,
    };
  }

  // ─────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    const keys = await this.redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // ─────────────────────────────────────────
  // Validate Token (called by Gateway)
  // ─────────────────────────────────────────

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as TokenPayload;

      const blacklistKey = `blacklist:${token.slice(-16)}`;
      const blacklisted = await this.redis.get(blacklistKey);
      if (blacklisted) throw Errors.INVALID_TOKEN();

      return payload;
    } catch (err) {
      if (err instanceof Errors.INVALID_TOKEN().constructor) throw err;
      const name = (err as { name?: string }).name;
      if (name === 'TokenExpiredError') throw Errors.TOKEN_EXPIRED();
      throw Errors.INVALID_TOKEN();
    }
  }

  // ─────────────────────────────────────────
  // Internal — Issue Tokens
  // ─────────────────────────────────────────

  private async issueTokens(
    userId: string,
    email: string,
    planId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = randomUUID();

    const accessPayload: TokenPayload = {
      userId,
      email,
      planId: planId as TokenPayload['planId'],
      type: 'access',
    };

    const refreshPayload: TokenPayload & { jti: string } = {
      userId,
      email,
      planId: planId as TokenPayload['planId'],
      type: 'refresh',
      jti,
    };

    const accessToken = jwt.sign(
      accessPayload as unknown as Record<string, unknown>,
      config.JWT_ACCESS_SECRET,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: config.JWT_ACCESS_EXPIRES_IN as any },
    );

    const refreshToken = jwt.sign(
      refreshPayload as unknown as Record<string, unknown>,
      config.JWT_REFRESH_SECRET,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any },
    );

    await this.redis.setex(
      `refresh:${userId}:${jti}`,
      7 * 24 * 60 * 60,
      JSON.stringify({ userId, planId, issuedAt: Date.now() }),
    );

    return { accessToken, refreshToken };
  }
}
