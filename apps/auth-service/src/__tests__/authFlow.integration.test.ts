import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../services/authService.js';

vi.mock('@ai-gateway/config', () => ({
  getAuthConfig: () => ({
    JWT_ACCESS_SECRET: 'access-secret-access-secret-access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret-refresh-secret-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  }),
}));

type UserRow = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  planId: 'free' | 'pro' | 'max';
  creditBalance: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
};

class InMemoryPool {
  private readonly usersById = new Map<string, UserRow>();

  async query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }> {
    if (sql.includes('SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists')) {
      const email = String(params[0]).toLowerCase();
      const exists = [...this.usersById.values()].some((user) => user.email === email);
      return { rows: [{ exists }] as T[] };
    }

    if (sql.includes('INSERT INTO users')) {
      const user: UserRow = {
        id: String(params[0]),
        email: String(params[1]).toLowerCase(),
        name: String(params[2]),
        passwordHash: String(params[3]),
        planId: params[4] as UserRow['planId'],
        creditBalance: Number(params[5]),
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      this.usersById.set(user.id, user);
      return { rows: [user as unknown as T] };
    }

    if (sql.includes('FROM users WHERE email = $1 AND is_active = true')) {
      const email = String(params[0]).toLowerCase();
      const user = [...this.usersById.values()].find((candidate) => candidate.email === email && candidate.isActive);
      return { rows: user ? [user as unknown as T] : [] };
    }

    if (sql.includes('FROM users WHERE id = $1 AND is_active = true')) {
      const userId = String(params[0]);
      const user = this.usersById.get(userId);
      return { rows: user && user.isActive ? [user as unknown as T] : [] };
    }

    throw new Error(`Unexpected query: ${sql}`);
  }
}

class InMemoryRedis {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setex(key: string, _ttlSeconds: number, value: string): Promise<'OK'> {
    this.values.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.values.delete(key)) {
        removed += 1;
      }
    }
    return removed;
  }

  async keys(pattern: string): Promise<string[]> {
    if (!pattern.includes('*')) {
      return this.values.has(pattern) ? [pattern] : [];
    }
    const prefix = pattern.split('*')[0] ?? '';
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

describe('AuthService integration flow', () => {
  it('supports signup -> login -> refresh with refresh token rotation', async () => {
    const db = new InMemoryPool();
    const redis = new InMemoryRedis();
    const service = new AuthService(db as never, redis as never);

    const signup = await service.signup({
      email: 'flow@example.com',
      name: 'Flow User',
      password: 'very-strong-password',
    });

    expect(signup.user.email).toBe('flow@example.com');
    expect(signup.refreshToken).toBeTruthy();

    const login = await service.login({
      email: 'flow@example.com',
      password: 'very-strong-password',
    });

    expect(login.user.id).toBe(signup.user.id);
    expect(login.accessToken).toBeTruthy();
    expect(login.refreshToken).toBeTruthy();

    const refreshed = await service.refresh(login.refreshToken);
    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).toBeTruthy();
    expect(refreshed.refreshToken).not.toBe(login.refreshToken);

    // The old refresh token should be single-use after rotation.
    await expect(service.refresh(login.refreshToken)).rejects.toMatchObject({ code: 'AUTH_002' });
  });
});
