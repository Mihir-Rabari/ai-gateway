import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { AddressInfo } from 'node:net';
import { gatewayRoutes } from '../routes/gatewayRoutes.js';
import { GatewayService } from '../services/gatewayService.js';

type GatewayPrototype = {
  validateToken: (token: string) => Promise<{ userId: string; planId: string; email: string }>;
  lockCredits: (userId: string, requestId: string, amount: number) => Promise<void>;
  confirmCredits: (userId: string, requestId: string) => Promise<void>;
};

const originalValidateToken = (GatewayService.prototype as unknown as GatewayPrototype).validateToken;
const originalLockCredits = (GatewayService.prototype as unknown as GatewayPrototype).lockCredits;
const originalConfirmCredits = (GatewayService.prototype as unknown as GatewayPrototype).confirmCredits;

afterEach(() => {
  (GatewayService.prototype as unknown as GatewayPrototype).validateToken = originalValidateToken;
  (GatewayService.prototype as unknown as GatewayPrototype).lockCredits = originalLockCredits;
  (GatewayService.prototype as unknown as GatewayPrototype).confirmCredits = originalConfirmCredits;
});

describe('gatewayRoutes integration', () => {
  test('handles /gateway/request with mocked auth/credit and real routing HTTP call', async () => {
    const routingApp = Fastify({ logger: false });
    let routingCallCount = 0;
    let routingLastRequest: Record<string, unknown> | undefined;

    await routingApp.post('/internal/routing/route', async (req) => {
      routingCallCount += 1;
      routingLastRequest = req.body as Record<string, unknown>;

      return {
        success: true,
        data: {
          output: 'hello-from-routing',
          tokensInput: 4,
          tokensOutput: 6,
          tokensTotal: 10,
          model: 'gpt-4o',
          provider: 'openai',
        },
      };
    });

    await routingApp.listen({ host: '127.0.0.1', port: 0 });
    const routingPort = (routingApp.server.address() as AddressInfo).port;

    const previousRoutingUrl = process.env['ROUTING_SERVICE_URL'];
    process.env['ROUTING_SERVICE_URL'] = `http://127.0.0.1:${routingPort}`;

    const app = Fastify({ logger: false });
    app.decorate('kafka', { publish: async () => undefined } as any);
    app.decorate('pg', {
      query: async () => {
        throw new Error('pg query is not expected for first-party app ids');
      },
    } as any);
    app.decorate('redis', {
      incr: async () => 1,
      expire: async () => 1,
    } as any);

    let lockCalled = false;
    let confirmCalled = false;
    (GatewayService.prototype as unknown as GatewayPrototype).validateToken = async () => ({
      userId: 'user-1',
      planId: 'pro',
      email: 'user@example.com',
    });
    (GatewayService.prototype as unknown as GatewayPrototype).lockCredits = async () => {
      lockCalled = true;
    };
    (GatewayService.prototype as unknown as GatewayPrototype).confirmCredits = async () => {
      confirmCalled = true;
    };

    try {
      await app.register(gatewayRoutes, { prefix: '/gateway' });

      const response = await app.inject({
        method: 'POST',
        url: '/gateway/request',
        headers: {
          authorization: 'Bearer access-token',
          'x-app-id': 'api-direct',
        },
        payload: {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'hello' }],
        },
      });

      assert.equal(response.statusCode, 200);
      const body = response.json() as {
        success: boolean;
        data: { output: string; provider: string; model: string };
      };

      assert.equal(body.success, true);
      assert.equal(body.data.output, 'hello-from-routing');
      assert.equal(body.data.provider, 'openai');
      assert.equal(body.data.model, 'gpt-4o');
      assert.equal(lockCalled, true);
      assert.equal(confirmCalled, true);
      assert.equal(routingCallCount, 1);
      assert.equal(routingLastRequest?.['model'], 'gpt-4o');
    } finally {
      if (previousRoutingUrl === undefined) {
        delete process.env['ROUTING_SERVICE_URL'];
      } else {
        process.env['ROUTING_SERVICE_URL'] = previousRoutingUrl;
      }
      await app.close();
      await routingApp.close();
    }
  });
});
