import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { fetch } from 'undici';
import { ok, createLogger, generateId } from '@ai-gateway/utils';
import { PLANS, KAFKA_TOPICS } from '@ai-gateway/config';
import type { BillingEvent } from '@ai-gateway/types';

const logger = createLogger('billing-routes');

const razorpay = new Razorpay({
  key_id: process.env['RAZORPAY_KEY_ID'] ?? '',
  key_secret: process.env['RAZORPAY_KEY_SECRET'] ?? '',
});

export async function billingRoutes(fastify: FastifyInstance) {
  // GET /billing/plans
  fastify.get('/plans', async (_req, reply) => {
    return reply.send(ok({ plans: Object.values(PLANS) }));
  });

  // POST /billing/subscribe
  fastify.post(
    '/subscribe',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'planId'],
          properties: {
            userId: { type: 'string' },
            planId: { type: 'string', enum: ['pro', 'max'] },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { userId: string; planId: 'pro' | 'max' } }>, reply: FastifyReply) => {
      try {
        const subscription = await razorpay.subscriptions.create({
          plan_id: req.body.planId,
          total_count: 12,
          quantity: 1,
          customer_notify: 1,
        });

        await fastify.pg.query(
          `INSERT INTO subscriptions (id, user_id, plan_id, status, razorpay_subscription_id)
           VALUES ($1, $2, $3, 'pending', $4)
           ON CONFLICT (user_id) DO UPDATE
           SET plan_id = $3, status = 'pending', razorpay_subscription_id = $4, updated_at = NOW()`,
          [generateId(), req.body.userId, req.body.planId, subscription.id],
        );

        return reply.send(ok({ subscriptionId: subscription.id, planId: req.body.planId }));
      } catch (err) {
        logger.error(err, 'Subscribe failed');
        return reply.status(500).send({ success: false, error: { code: 'INTERNAL', message: String(err), statusCode: 500 } });
      }
    },
  );

  // POST /billing/webhooks/razorpay
  fastify.post(
    '/webhooks/razorpay',
    { config: { rawBody: true } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const signature = req.headers['x-razorpay-signature'] as string | undefined;
        const secret = process.env['RAZORPAY_WEBHOOK_SECRET'] ?? '';
        const body = JSON.stringify(req.body);

        if (!signature) return reply.status(400).send({ error: 'Missing signature' });

        const expectedSig = createHmac('sha256', secret).update(body).digest('hex');
        if (expectedSig !== signature) return reply.status(400).send({ error: 'Invalid signature' });

        const event = req.body as {
          event: string;
          payload: {
            subscription: { entity: { id: string } };
            payment?: { entity: { amount: number } };
          };
        };

        logger.info({ event: event.event }, 'Razorpay webhook received');

        if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
          const subId = event.payload.subscription.entity.id;

          const result = await fastify.pg.query<{ user_id: string; plan_id: string }>(
            'SELECT user_id, plan_id FROM subscriptions WHERE razorpay_subscription_id = $1',
            [subId],
          );

          const row = result.rows[0];
          if (row) {
            const { user_id, plan_id } = row;
            const plan = PLANS[plan_id as keyof typeof PLANS];
            const planCredits = plan?.credits ?? 100;

            await fastify.pg.query(
              'UPDATE users SET plan_id = $1, updated_at = NOW() WHERE id = $2',
              [plan_id, user_id],
            );

            await fetch(`${process.env['CREDIT_SERVICE_URL'] ?? 'http://localhost:3005'}/credits/add`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user_id, amount: planCredits, reason: 'subscription' }),
            });

            const billingEvent: BillingEvent = {
              eventId: generateId(),
              topic: 'billing.events',
              type: event.event === 'subscription.activated'
                ? 'billing.subscription.created'
                : 'billing.subscription.renewed',
              userId: user_id,
              planId: plan_id as BillingEvent['planId'],
              amountPaise: event.payload.payment?.entity.amount ?? 0,
              timestamp: new Date().toISOString(),
              version: '1.0',
            };
            void fastify.kafka.publish(KAFKA_TOPICS.BILLING, billingEvent);
          }
        }

        return reply.send({ received: true });
      } catch (err) {
        logger.error(err, 'Webhook processing failed');
        return reply.status(500).send({ error: 'Webhook failed' });
      }
    },
  );
}
