import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { createHmac } from 'crypto';
import { billingRoutes } from '../routes/billingRoutes.js';

class InMemoryRedis {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setex(key: string, _ttl: number, value: string): Promise<'OK'> {
    this.values.set(key, value);
    return 'OK';
  }
}

class InMemoryPg {
  async query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }> {
    if (sql.includes('SELECT user_id, plan_id FROM subscriptions WHERE razorpay_subscription_id = $1')) {
      if (params[0] === 'sub_test_123') {
        return { rows: [{ user_id: 'user_1', plan_id: 'pro' } as T] };
      }
      return { rows: [] };
    }

    // Webhook flow also updates subscription/user records; we accept these as no-op writes.
    if (sql.startsWith('UPDATE subscriptions') || sql.startsWith('UPDATE users')) {
      return { rows: [] };
    }

    return { rows: [] };
  }
}

test('Razorpay webhook route verifies signature and is idempotent', async () => {
  process.env['RAZORPAY_WEBHOOK_SECRET'] = 'whsec_test_secret';

  const published: Array<{ topic: string; message: object }> = [];
  const app = Fastify({ logger: false });
  app.decorate('pg', new InMemoryPg() as never);
  app.decorate('redis', new InMemoryRedis() as never);
  app.decorate('kafka', {
    producer: {} as never,
    publish: async (topic: string, message: object) => {
      published.push({ topic, message });
    },
  } as never);

  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      const rawBody = body.toString();
      (req as any).rawBody = rawBody;
      done(null, JSON.parse(rawBody));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(billingRoutes, { prefix: '/billing' });

  const payload = {
    event: 'payment.failed',
    payload: {
      subscription: { entity: { id: 'sub_test_123' } },
      payment: { entity: { amount: 49900 } },
    },
  };
  const rawPayload = JSON.stringify(payload);
  const signature = createHmac('sha256', process.env['RAZORPAY_WEBHOOK_SECRET'] ?? '')
    .update(rawPayload)
    .digest('hex');

  const first = await app.inject({
    method: 'POST',
    url: '/billing/webhooks/razorpay',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': 'evt_test_1',
    },
    payload: rawPayload,
  });

  assert.equal(first.statusCode, 200);
  assert.deepEqual(first.json(), { received: true });
  assert.equal(published.length, 1);
  const event = published[0]?.message as { type?: string; userId?: string };
  assert.equal(event.type, 'billing.payment.failed');
  assert.equal(event.userId, 'user_1');

  const second = await app.inject({
    method: 'POST',
    url: '/billing/webhooks/razorpay',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': 'evt_test_1',
    },
    payload: rawPayload,
  });

  assert.equal(second.statusCode, 200);
  assert.deepEqual(second.json(), { received: true, message: 'Already processed' });
  assert.equal(published.length, 1);

  await app.close();
});

test('Razorpay webhook route rejects invalid signature', async () => {
  process.env['RAZORPAY_WEBHOOK_SECRET'] = 'whsec_test_secret';

  const app = Fastify({ logger: false });
  app.decorate('pg', new InMemoryPg() as never);
  app.decorate('redis', new InMemoryRedis() as never);
  app.decorate(
    'kafka',
    {
      producer: {} as never,
      publish: async () => undefined,
    } as never,
  );

  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      const rawBody = body.toString();
      (req as any).rawBody = rawBody;
      done(null, JSON.parse(rawBody));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(billingRoutes, { prefix: '/billing' });

  const response = await app.inject({
    method: 'POST',
    url: '/billing/webhooks/razorpay',
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': 'bad_signature',
      'x-razorpay-event-id': 'evt_test_bad',
    },
    payload: JSON.stringify({
      event: 'payment.failed',
      payload: { subscription: { entity: { id: 'sub_test_123' } } },
    }),
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), { error: 'Invalid signature' });

  await app.close();
});
