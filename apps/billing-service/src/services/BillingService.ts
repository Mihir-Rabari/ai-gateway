import Razorpay from 'razorpay';
import { fetch } from 'undici';
import { generateId, createLogger } from '@ai-gateway/utils';
import { PLANS, KAFKA_TOPICS } from '@ai-gateway/config';
import type { BillingEvent, PlanType } from '@ai-gateway/types';
import type { BillingRepository } from '../repositories/BillingRepository.js';
import type { FastifyInstance } from 'fastify';

const logger = createLogger('billing-service-class');

const razorpay = new Razorpay({
  key_id: process.env['RAZORPAY_KEY_ID'] ?? '',
  key_secret: process.env['RAZORPAY_KEY_SECRET'] ?? '',
});

interface RazorpayClientLike {
  subscriptions: {
    create: (input: {
      plan_id: string;
      total_count: number;
      quantity: number;
      customer_notify: number;
    }) => Promise<{ id: string }>;
    cancel: (id: string, options: unknown) => Promise<void>;
  };
}

interface BillingServiceDeps {
  razorpayClient?: RazorpayClientLike;
  httpFetch?: typeof fetch;
}

export class BillingService {
  constructor(
    private readonly repo: BillingRepository,
    private readonly fastify: FastifyInstance,
    private readonly deps: BillingServiceDeps = {},
  ) {}

  private get razorpayClient(): RazorpayClientLike {
    return this.deps.razorpayClient ?? (razorpay as unknown as RazorpayClientLike);
  }

  private get httpFetch(): typeof fetch {
    return this.deps.httpFetch ?? fetch;
  }

  private resolveRazorpayPlanId(planId: 'pro' | 'max'): string {
    const razorpayPlanId =
      planId === 'pro' ? process.env['RAZORPAY_PLAN_ID_PRO']
      : planId === 'max' ? process.env['RAZORPAY_PLAN_ID_MAX']
      : null;

    if (!razorpayPlanId) {
      throw new Error(`Missing Razorpay plan mapping for ${planId}`);
    }

    return razorpayPlanId;
  }

  async createSubscription(userId: string, planId: 'pro' | 'max') {
    const razorpayPlanId = this.resolveRazorpayPlanId(planId);

    const subscription = await this.razorpayClient.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
    });

    await this.repo.createPendingSubscription(generateId(), userId, planId, subscription.id);

    return { subscriptionId: subscription.id, planId };
  }

  async processWebhook(
    eventId: string,
    event: string,
    payload: {
      subscription?: { entity: { id: string } };
      payment?: { entity: { amount: number } };
    },
  ) {
    const isProcessed = await this.fastify.redis.get(`webhook:processed:${eventId}`);
    if (isProcessed) {
      return { received: true, message: 'Already processed' };
    }

    const subId = payload.subscription?.entity?.id;
    let userId: string | undefined;
    let planId: PlanType | undefined;

    if (subId) {
      const row = await this.repo.getSubscriptionByRazorpayId(subId);
      if (row) {
        userId = row.user_id;
        planId = row.plan_id as PlanType;
      }
    }

    if (userId && planId) {
      if (event === 'subscription.activated' || event === 'subscription.charged') {
        const plan = PLANS[planId];
        const planCredits = plan?.credits ?? 100;

        await this.repo.updateSubscriptionStatus(subId!, 'active');
        await this.repo.updateUserPlan(userId, planId);

        await this.httpFetch(`${process.env['CREDIT_SERVICE_URL'] ?? 'http://localhost:3005'}/credits/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, amount: planCredits, reason: 'subscription' }),
        });

        const type: BillingEvent['type'] = event === 'subscription.activated'
            ? 'billing.subscription.created'
            : 'billing.subscription.renewed';

        const billingEvent: BillingEvent = {
          eventId: generateId(),
          topic: 'billing.events',
          type,
          userId,
          planId: planId as BillingEvent['planId'],
          amountPaise: payload.payment?.entity.amount ?? 0,
          timestamp: new Date().toISOString(),
          version: '1.0',
        };
        void this.fastify.kafka.publish(KAFKA_TOPICS.BILLING, billingEvent).catch((err) => {
          logger.error(err, 'Failed to publish billing event');
        });
      } else if (event === 'subscription.cancelled') {
        await this.repo.updateSubscriptionStatus(subId!, 'cancelled');
        await this.repo.updateUserPlan(userId, 'free');

        const billingEvent: BillingEvent = {
          eventId: generateId(),
          topic: 'billing.events',
          type: 'billing.subscription.cancelled',
          userId,
          planId: 'free',
          amountPaise: 0,
          timestamp: new Date().toISOString(),
          version: '1.0',
        };
        void this.fastify.kafka.publish(KAFKA_TOPICS.BILLING, billingEvent).catch((err) => {
          logger.error(err, 'Failed to publish billing event');
        });
      } else if (event === 'payment.failed') {
        const billingEvent: BillingEvent = {
          eventId: generateId(),
          topic: 'billing.events',
          type: 'billing.payment.failed',
          userId,
          planId: planId as BillingEvent['planId'],
          amountPaise: payload.payment?.entity.amount ?? 0,
          timestamp: new Date().toISOString(),
          version: '1.0',
        };

        void this.fastify.kafka.publish(KAFKA_TOPICS.BILLING, billingEvent).catch((err) => {
          logger.error(err, 'Failed to publish billing event for payment failure');
        });
      }
    }

    await this.fastify.redis.setex(`webhook:processed:${eventId}`, 86400, '1');
    return { received: true };
  }

  async getSubscription(userId: string) {
    const sub = await this.repo.getSubscriptionByUserId(userId);
    return sub ?? { planId: 'free', status: 'none' };
  }

  async cancelSubscription(userId: string) {
    const razorpaySubscriptionId = await this.repo.getActiveRazorpaySubscriptionIdByUserId(userId);
    if (!razorpaySubscriptionId) {
      return null;
    }

    // Razorpay typed issue bypass without `any`.
    // The library typing for cancel might be limited.
    await this.razorpayClient.subscriptions.cancel(
      razorpaySubscriptionId,
      { cancel_at_cycle_end: 1 }
    );

    // According to instructions: cancel at end of billing cycle, but DB immediately to cancelled.
    // Let's do as instruction said:
    await this.repo.updateSubscriptionStatus(razorpaySubscriptionId, 'cancelled');

    return { cancelled: true, effectiveAt: 'end-of-billing-cycle' };
  }
}
