import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { BillingService } from '../services/BillingService.js';

type RepoLike = {
  createPendingSubscription: (...args: unknown[]) => Promise<void>;
  getSubscriptionByRazorpayId: (...args: unknown[]) => Promise<{ user_id: string; plan_id: string } | undefined>;
  updateSubscriptionStatus: (...args: unknown[]) => Promise<void>;
  updateUserPlan: (...args: unknown[]) => Promise<void>;
  getSubscriptionByUserId: (...args: unknown[]) => Promise<unknown>;
  getActiveRazorpaySubscriptionIdByUserId: (...args: unknown[]) => Promise<string | null>;
};

function createFastifyMock() {
  const published: Array<{ topic: string; msg: object }> = [];
  const processed = new Map<string, string>();

  const fastify = {
    redis: {
      get: async (key: string) => processed.get(key) ?? null,
      setex: async (key: string, _ttl: number, value: string) => {
        processed.set(key, value);
      },
    },
    kafka: {
      publish: async (topic: string, msg: object) => {
        published.push({ topic, msg });
      },
    },
  } as unknown as FastifyInstance;

  return { fastify, published, processed };
}

describe('BillingService', () => {
  test('createSubscription maps local plan IDs to Razorpay plan IDs', async () => {
    process.env['RAZORPAY_PLAN_ID_PRO'] = 'plan_live_pro';
    process.env['RAZORPAY_PLAN_ID_MAX'] = 'plan_live_max';

    const createCalls: Array<{ plan_id: string }> = [];
    const repo: RepoLike = {
      createPendingSubscription: async () => undefined,
      getSubscriptionByRazorpayId: async () => undefined,
      updateSubscriptionStatus: async () => undefined,
      updateUserPlan: async () => undefined,
      getSubscriptionByUserId: async () => undefined,
      getActiveRazorpaySubscriptionIdByUserId: async () => null,
    };

    const { fastify } = createFastifyMock();
    const service = new BillingService(repo as never, fastify, {
      razorpayClient: {
        subscriptions: {
          create: async (input) => {
            createCalls.push({ plan_id: input.plan_id });
            return { id: 'sub_123' };
          },
          cancel: async () => undefined,
        },
      },
    });

    const result = await service.createSubscription('user-1', 'pro');

    assert.equal(result.subscriptionId, 'sub_123');
    assert.equal(createCalls.length, 1);
    assert.equal(createCalls[0]?.plan_id, 'plan_live_pro');
  });

  test('processWebhook activates subscription, adds credits, and publishes event', async () => {
    const repoCalls: string[] = [];
    const repo: RepoLike = {
      createPendingSubscription: async () => undefined,
      getSubscriptionByRazorpayId: async () => ({ user_id: 'user-1', plan_id: 'pro' }),
      updateSubscriptionStatus: async () => { repoCalls.push('updateSubscriptionStatus'); },
      updateUserPlan: async () => { repoCalls.push('updateUserPlan'); },
      getSubscriptionByUserId: async () => undefined,
      getActiveRazorpaySubscriptionIdByUserId: async () => null,
    };

    const { fastify, published, processed } = createFastifyMock();
    const fetchCalls: Array<{ url: string; body: string }> = [];

    const service = new BillingService(repo as never, fastify, {
      httpFetch: async (url, init) => {
        fetchCalls.push({ url: String(url), body: String(init?.body ?? '') });
        return { ok: true } as Response;
      },
    });

    const result = await service.processWebhook('evt_1', 'subscription.activated', {
      subscription: { entity: { id: 'sub_123' } },
      payment: { entity: { amount: 49900 } },
    });

    assert.deepEqual(result, { received: true });
    assert.deepEqual(repoCalls, ['updateSubscriptionStatus', 'updateUserPlan']);
    assert.equal(fetchCalls.length, 1);
    assert.match(fetchCalls[0]?.url ?? '', /\/credits\/add$/);
    assert.match(fetchCalls[0]?.body ?? '', /"userId":"user-1"/);
    assert.equal(published.length, 1);
    assert.equal(processed.get('webhook:processed:evt_1'), '1');
  });
});
