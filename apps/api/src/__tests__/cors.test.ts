import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';

describe('CORS configuration', () => {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:3009'];

  const createTestApp = async (origins?: string) => {
    const app = Fastify();
    await app.register(cors, {
      origin: origins?.split(',') ?? allowedOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    app.get('/test', async () => ({ ok: true }));
    return app;
  };

  test('allows requests from default allowed origins', async () => {
    const app = await createTestApp();

    for (const origin of allowedOrigins) {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { origin },
      });
      assert.equal(response.headers['access-control-allow-origin'], origin);
      assert.equal(response.headers['access-control-allow-credentials'], 'true');
    }
  });

  test('allows requests from custom ALLOWED_ORIGINS', async () => {
    const customOrigins = 'https://myapp.com,https://console.myapp.com';
    const app = await createTestApp(customOrigins);

    for (const origin of customOrigins.split(',')) {
      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { origin },
      });
      assert.equal(response.headers['access-control-allow-origin'], origin);
    }
  });

  test('disallows requests from unauthorized origins', async () => {
    const app = await createTestApp();
    const unauthorizedOrigin = 'http://malicious.com';

    const response = await app.inject({
      method: 'GET',
      url: '/test',
      headers: { origin: unauthorizedOrigin },
    });

    // When origin is not allowed, fastify-cors typically doesn't set the ACAO header or sets it to null/matches nothing
    assert.notEqual(response.headers['access-control-allow-origin'], unauthorizedOrigin);
  });
});
