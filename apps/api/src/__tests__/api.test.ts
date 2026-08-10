import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { AppService } from '../services/AppService.js';
import { AppRepository, type AppRow } from '../repositories/AppRepository.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createFetchMock } from '../../../test-setup.js';
import type { Pool, PoolClient } from 'pg';

// ───────────────────────────────────────────────────────────────────────────
// Mocks
// ───────────────────────────────────────────────────────────────────────────

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_value'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

const originalFetch = globalThis.fetch;

function makePgPool(queryMock: ReturnType<typeof vi.fn>, connectMock: ReturnType<typeof vi.fn>): Pool {
  return { query: queryMock, connect: connectMock } as unknown as Pool;
}
function makePgClient(queryMock: ReturnType<typeof vi.fn>): PoolClient {
  return { query: queryMock, release: vi.fn() } as unknown as PoolClient;
}

const MOCK_APP_ROW: AppRow = {
  id: 'app-1', name: 'Test App', description: 'desc', clientId: 'client-abc',
  redirectUris: ['http://localhost:3000/callback'], isActive: true, createdAt: new Date('2024-01-01'),
};


// ───────────────────────────────────────────────────────────────────────────
// Health endpoint tests
// ───────────────────────────────────────────────────────────────────────────

describe('Health endpoint', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = Fastify();
    const { healthRoute } = await import('../routes/health.js');
    await app.register(healthRoute);
  });
  afterEach(async () => { await app.close(); });

  it('GET /health returns 200 with status ok and timestamp', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// requireAuth middleware (auth routes proxy)
// ───────────────────────────────────────────────────────────────────────────

describe('requireAuth middleware (auth routes proxy)', () => {
  let app: FastifyInstance;
  beforeEach(async () => { app = Fastify(); });
  afterEach(async () => { await app.close(); globalThis.fetch = originalFetch; });

  it('returns 401 when no Authorization header is present', async () => {
    app.get('/protected', { preHandler: [requireAuth] }, async (_req, reply) => reply.send({ ok: true }));
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/protected' });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error.code).toBe('AUTH_001');
  });

  it('returns 401 when Authorization header lacks Bearer prefix', async () => {
    app.get('/protected', { preHandler: [requireAuth] }, async (_req, reply) => reply.send({ ok: true }));
    await app.ready();
    const response = await app.inject({
      method: 'GET', url: '/protected', headers: { authorization: 'Basic abc' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('sets req.userId on success when auth service validates the token', async () => {
    let capturedUserId: string | undefined;
    app.get('/protected', { preHandler: [requireAuth] }, async (req, reply) => {
      capturedUserId = req.userId;
      return reply.send({ ok: true });
    });
    await app.ready();
    globalThis.fetch = createFetchMock({
      routes: {
        '/internal/auth/validate': () => ({
          status: 200, ok: true,
          json: async () => ({ success: true, data: { userId: 'user-42', planId: 'pro', email: 'u@e.com' } }),
        }),
      },
    }) as typeof fetch;
    const response = await app.inject({
      method: 'GET', url: '/protected', headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.statusCode).toBe(200);
    expect(capturedUserId).toBe('user-42');
  });

  it('returns 401 when auth service responds with non-200 status', async () => {
    app.get('/protected', { preHandler: [requireAuth] }, async (_req, reply) => reply.send({ ok: true }));
    await app.ready();
    globalThis.fetch = createFetchMock({
      routes: {
        '/internal/auth/validate': () => ({
          status: 401, ok: false,
          json: async () => ({ success: false, error: { code: 'AUTH_002', message: 'Invalid' } }),
        }),
      },
    }) as typeof fetch;
    const response = await app.inject({
      method: 'GET', url: '/protected', headers: { authorization: 'Bearer expired' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns 401 (AUTH_003) when auth service is unreachable', async () => {
    app.get('/protected', { preHandler: [requireAuth] }, async (_req, reply) => reply.send({ ok: true }));
    await app.ready();
    globalThis.fetch = (async () => { throw new Error('connection refused'); }) as typeof fetch;
    const response = await app.inject({
      method: 'GET', url: '/protected', headers: { authorization: 'Bearer valid' },
    });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error.code).toBe('AUTH_003');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Models endpoint
// ───────────────────────────────────────────────────────────────────────────

describe('Models endpoint', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    const { modelRoutes } = await import('../routes/v1/models.js');
    await app.register(modelRoutes, { prefix: '/api/v1' });
  });
  afterEach(async () => { await app.close(); globalThis.fetch = originalFetch; });

  it('GET /api/v1/models proxies to the gateway and returns the model list', async () => {
    globalThis.fetch = createFetchMock({
      routes: {
        '/gateway/models': () => ({
          status: 200, ok: true,
          json: async () => ({ success: true, data: { models: ['gpt-4o', 'gpt-3.5-turbo'] } }),
        }),
      },
    }) as typeof fetch;
    const response = await app.inject({ method: 'GET', url: '/api/v1/models' });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.models).toEqual(['gpt-4o', 'gpt-3.5-turbo']);
  });

  it('propagates the gateway error status when the gateway returns an error', async () => {
    globalThis.fetch = createFetchMock({
      routes: {
        '/gateway/models': () => ({
          status: 503, ok: false,
          json: async () => ({ success: false, error: { code: 'GATEWAY_DOWN' } }),
        }),
      },
    }) as typeof fetch;
    const response = await app.inject({ method: 'GET', url: '/api/v1/models' });
    expect(response.statusCode).toBe(503);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Usage endpoint
// ───────────────────────────────────────────────────────────────────────────

describe('Usage endpoint', () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    const { usageRoutes } = await import('../routes/v1/usage.js');
    await app.register(usageRoutes, { prefix: '/api/v1' });
  });
  afterEach(async () => { await app.close(); globalThis.fetch = originalFetch; });

  it('GET /api/v1/usage requires authentication (401 without token)', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/usage' });
    expect(response.statusCode).toBe(401);
  });

  it('GET /api/v1/usage proxies to analytics service when authenticated', async () => {
    globalThis.fetch = createFetchMock({
      routes: {
        '/internal/auth/validate': () => ({
          status: 200, ok: true,
          json: async () => ({ success: true, data: { userId: 'user-1', planId: 'free', email: 'u@e.com' } }),
        }),
        '/analytics/dashboard': () => ({
          status: 200, ok: true,
          json: async () => ({ success: true, data: { totalRequests: 42 } }),
        }),
      },
    }) as typeof fetch;
    const response = await app.inject({
      method: 'GET', url: '/api/v1/usage', headers: { authorization: 'Bearer valid' },
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.totalRequests).toBe(42);
  });
});


// ───────────────────────────────────────────────────────────────────────────
// AppService tests (apps CRUD logic)
// ───────────────────────────────────────────────────────────────────────────

describe('AppService (apps CRUD)', () => {
  let appService: AppService;
  let mockRepo: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      withTransaction: vi.fn(async (cb: (c: PoolClient) => Promise<unknown>) => cb(makePgClient(vi.fn()))),
      createApp: vi.fn(async () => {}),
      createApiKey: vi.fn(async () => {}),
      findAppsByDeveloperId: vi.fn(async () => []),
      getAppById: vi.fn(async () => null),
      deleteApp: vi.fn(async () => ({ success: true, clientId: 'client-1' })),
      findActiveAppById: vi.fn(async () => true),
      revokeActiveApiKeys: vi.fn(async () => {}),
      updateRedirectUris: vi.fn(async () => true),
    };
    appService = new AppService(mockRepo as unknown as AppRepository);
  });

  describe('registerApp', () => {
    it('creates an app with apiKey, clientId, and clientSecret', async () => {
      const result = await appService.registerApp('dev-1', 'My App', 'desc', ['http://localhost/cb']);
      expect(result.id).toBeDefined();
      expect(result.name).toBe('My App');
      expect(result.apiKey).toMatch(/^agk_live_/);
      expect(result.clientId).toMatch(/^client_/);
      expect(result.clientSecret).toMatch(/^secret_/);
      expect(result.redirectUris).toEqual(['http://localhost/cb']);
      expect(mockRepo.withTransaction).toHaveBeenCalledTimes(1);
      expect(mockRepo.createApp).toHaveBeenCalledTimes(1);
      expect(mockRepo.createApiKey).toHaveBeenCalledTimes(1);
    });

    it('passes null for clientSecretEnc when no encryption key is set', async () => {
      delete process.env['CLIENT_SECRET_ENCRYPTION_KEY'];
      await appService.registerApp('dev-1', 'App', undefined, []);
      expect(mockRepo.createApp.mock.calls[0][8]).toBeNull();
    });

    it('passes encrypted secret when encryption key is set', async () => {
      process.env['CLIENT_SECRET_ENCRYPTION_KEY'] = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      await appService.registerApp('dev-1', 'App', undefined, []);
      const enc = mockRepo.createApp.mock.calls[0][8];
      expect(enc).not.toBeNull();
      expect(enc).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
      delete process.env['CLIENT_SECRET_ENCRYPTION_KEY'];
    });
  });

  describe('listApps', () => {
    it('delegates to repo.findAppsByDeveloperId', async () => {
      mockRepo.findAppsByDeveloperId.mockResolvedValueOnce([MOCK_APP_ROW]);
      const result = await appService.listApps('dev-1');
      expect(result).toEqual([MOCK_APP_ROW]);
      expect(mockRepo.findAppsByDeveloperId).toHaveBeenCalledWith('dev-1');
    });
  });

  describe('getApp', () => {
    it('returns the app when found', async () => {
      mockRepo.getAppById.mockResolvedValueOnce(MOCK_APP_ROW);
      expect(await appService.getApp('app-1', 'dev-1')).toEqual(MOCK_APP_ROW);
    });
    it('returns null when not found', async () => {
      mockRepo.getAppById.mockResolvedValueOnce(null);
      expect(await appService.getApp('app-1', 'dev-1')).toBeNull();
    });
  });

  describe('deleteApp', () => {
    it('returns success and clientId from the repo', async () => {
      mockRepo.deleteApp.mockResolvedValueOnce({ success: true, clientId: 'client-abc' });
      expect(await appService.deleteApp('app-1', 'dev-1')).toEqual({ success: true, clientId: 'client-abc' });
    });
    it('returns success=false when the app does not exist', async () => {
      mockRepo.deleteApp.mockResolvedValueOnce({ success: false, clientId: null });
      expect((await appService.deleteApp('app-1', 'dev-1')).success).toBe(false);
    });
  });

  describe('rotateApiKey', () => {
    it('returns a new API key when the app exists', async () => {
      mockRepo.findActiveAppById.mockResolvedValueOnce(true);
      const result = await appService.rotateApiKey('app-1', 'dev-1');
      expect(result).not.toBeNull();
      expect(result!.apiKey).toMatch(/^agk_live_/);
      expect(mockRepo.revokeActiveApiKeys).toHaveBeenCalledTimes(1);
      expect(mockRepo.createApiKey).toHaveBeenCalledTimes(1);
    });
    it('returns null when the app does not exist', async () => {
      mockRepo.findActiveAppById.mockResolvedValueOnce(false);
      expect(await appService.rotateApiKey('app-1', 'dev-1')).toBeNull();
    });
  });

  describe('updateRedirectUris', () => {
    it('delegates to repo.updateRedirectUris', async () => {
      mockRepo.updateRedirectUris.mockResolvedValueOnce(true);
      expect(await appService.updateRedirectUris('app-1', 'dev-1', ['http://new/cb'])).toBe(true);
      expect(mockRepo.updateRedirectUris).toHaveBeenCalledWith('app-1', 'dev-1', ['http://new/cb']);
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// AppRepository tests
// ───────────────────────────────────────────────────────────────────────────

describe('AppRepository', () => {
  let repo: AppRepository;
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockClientQuery: ReturnType<typeof vi.fn>;
  let mockClient: PoolClient;
  let mockConnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockQuery = vi.fn();
    mockClientQuery = vi.fn();
    mockClient = makePgClient(mockClientQuery);
    mockConnect = vi.fn().mockResolvedValue(mockClient);
    repo = new AppRepository(makePgPool(mockQuery, mockConnect));
  });

  describe('withTransaction', () => {
    it('executes BEGIN, callback, COMMIT and releases the client', async () => {
      const callback = vi.fn(async () => 'result');
      const result = await repo.withTransaction(callback);
      expect(result).toBe('result');
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(callback).toHaveBeenCalledWith(mockClient);
    });
    it('rolls back and re-throws when the callback throws', async () => {
      const callback = vi.fn(async () => { throw new Error('tx failed'); });
      await expect(repo.withTransaction(callback)).rejects.toThrow('tx failed');
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('findAppsByDeveloperId', () => {
    it('returns apps with parsed redirect URIs from array', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...MOCK_APP_ROW, redirectUris: ['http://a', 'http://b'] }], rowCount: 1,
      });
      const apps = await repo.findAppsByDeveloperId('dev-1');
      expect(apps).toHaveLength(1);
      expect(apps[0].redirectUris).toEqual(['http://a', 'http://b']);
    });
    it('parses redirect URIs from a JSON string', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...MOCK_APP_ROW, redirectUris: JSON.stringify(['http://x']) }], rowCount: 1,
      });
      const apps = await repo.findAppsByDeveloperId('dev-1');
      expect(apps[0].redirectUris).toEqual(['http://x']);
    });
    it('returns empty array for redirect URIs on invalid JSON', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...MOCK_APP_ROW, redirectUris: 'not-json' }], rowCount: 1,
      });
      const apps = await repo.findAppsByDeveloperId('dev-1');
      expect(apps[0].redirectUris).toEqual([]);
    });
  });

  describe('getAppById', () => {
    it('returns null when no rows match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      expect(await repo.getAppById('dev-1', 'app-1')).toBeNull();
    });
    it('returns the app row when found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [MOCK_APP_ROW], rowCount: 1 });
      expect(await repo.getAppById('dev-1', 'app-1')).toEqual(MOCK_APP_ROW);
    });
  });

  describe('deleteApp', () => {
    it('returns success=true with clientId when a row is updated', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ client_id: 'client-abc' }], rowCount: 1 });
      const result = await repo.deleteApp('app-1', 'dev-1');
      expect(result.success).toBe(true);
      expect(result.clientId).toBe('client-abc');
    });
    it('returns success=false when no row is updated', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await repo.deleteApp('app-1', 'dev-1');
      expect(result.success).toBe(false);
      expect(result.clientId).toBeNull();
    });
  });

  describe('findActiveAppById', () => {
    it('returns true when a row exists', async () => {
      mockClientQuery.mockResolvedValueOnce({ rows: [{ id: 'app-1' }], rowCount: 1 });
      expect(await repo.findActiveAppById(mockClient, 'app-1', 'dev-1')).toBe(true);
    });
    it('returns false when no row exists', async () => {
      mockClientQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      expect(await repo.findActiveAppById(mockClient, 'app-1', 'dev-1')).toBe(false);
    });
  });

  describe('updateRedirectUris', () => {
    it('returns true when a row is updated', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'app-1' }], rowCount: 1 });
      expect(await repo.updateRedirectUris('app-1', 'dev-1', ['http://new'])).toBe(true);
    });
    it('returns false when no row is updated', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      expect(await repo.updateRedirectUris('app-1', 'dev-1', ['http://new'])).toBe(false);
    });
    it('serializes redirect URIs to JSON', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'app-1' }], rowCount: 1 });
      await repo.updateRedirectUris('app-1', 'dev-1', ['http://a', 'http://b']);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE registered_apps'),
        [JSON.stringify(['http://a', 'http://b']), 'app-1', 'dev-1'],
      );
    });
  });
});

