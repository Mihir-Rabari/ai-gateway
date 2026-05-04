import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { billingRoutes } from '../routes/v1/billing.js';
import { usageRoutes } from '../routes/v1/usage.js';

type FetchCall = { url: string; init?: RequestInit };
const originalFetch = global.fetch;

describe('API route proxies', () => {
  let fetchCalls: FetchCall[];

  beforeEach(() => {
    fetchCalls = [];
    process.env['AUTH_SERVICE_URL'] = 'http://auth-service';
    process.env['BILLING_SERVICE_URL'] = 'http://billing-service';
    process.env['ANALYTICS_SERVICE_URL'] = 'http://analytics-service';

    global.fetch = (async (url: string | URL | globalThis.Request, init?: RequestInit) => {
      const normalizedUrl = typeof url === 'string' ? url : String(url);
      fetchCalls.push({ url: normalizedUrl, init });

      if (normalizedUrl.includes('/internal/auth/validate')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { userId: 'user-1', planId: 'pro', email: 'test@example.com' },
          }),
        } as Response;
      }

      if (normalizedUrl.includes('/billing/subscribe')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { subscriptionId: 'sub_123', planId: 'pro' } }),
        } as Response;
      }

      if (normalizedUrl.includes('/billing/subscription')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { planId: 'pro', status: 'active' } }),
        } as Response;
      }

      if (normalizedUrl.includes('/billing/cancel')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { cancelled: true } }),
        } as Response;
      }

      if (normalizedUrl.includes('/analytics/dashboard')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { thisMonth: { totalRequests: 10 } } }),
        } as Response;
      }

      throw new Error(`Unexpected fetch URL: ${normalizedUrl}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('billing subscribe forwards authenticated userId to billing-service', async () => {
    const app = Fastify();
    await app.register(billingRoutes, { prefix: '/api/v1' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/subscribe',
      headers: { authorization: 'Bearer access-token' },
      payload: { planId: 'pro' },
    });

    assert.equal(response.statusCode, 200);
    const upstreamCall = fetchCalls.find((call) => call.url.includes('/billing/subscribe'));
    assert.ok(upstreamCall);
    assert.match(String(upstreamCall?.init?.body ?? ''), /"userId":"user-1"/);
    assert.match(String(upstreamCall?.init?.body ?? ''), /"planId":"pro"/);

    await app.close();
  });

  test('billing subscription and cancel routes keep auth context intact', async () => {
    const app = Fastify();
    await app.register(billingRoutes, { prefix: '/api/v1' });

    const subscriptionResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/billing/subscription',
      headers: { authorization: 'Bearer access-token' },
    });
    assert.equal(subscriptionResponse.statusCode, 200);

    const cancelResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/cancel',
      headers: { authorization: 'Bearer access-token' },
    });
    assert.equal(cancelResponse.statusCode, 200);

    const subscriptionCall = fetchCalls.find((call) => call.url.includes('/billing/subscription'));
    const cancelCall = fetchCalls.find((call) => call.url.includes('/billing/cancel'));
    assert.match(subscriptionCall?.url ?? '', /userId=user-1/);
    assert.match(String(cancelCall?.init?.body ?? ''), /"userId":"user-1"/);

    await app.close();
  });

  test('usage and usage summary both proxy to analytics dashboard', async () => {
    const app = Fastify();
    await app.register(usageRoutes, { prefix: '/api/v1' });

    const usageResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/usage',
      headers: { authorization: 'Bearer access-token' },
    });

    const summaryResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/usage/summary',
      headers: { authorization: 'Bearer access-token' },
    });

    assert.equal(usageResponse.statusCode, 200);
    assert.equal(summaryResponse.statusCode, 200);

    const analyticsCalls = fetchCalls.filter((call) => call.url.includes('/analytics/dashboard'));
    assert.equal(analyticsCalls.length, 2);
    assert.ok(analyticsCalls.every((call) => call.url.includes('userId=user-1')));

    await app.close();
  });
});
