import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { ok, fail, Errors, createLogger } from '@ai-gateway/utils';
import { PLANS } from '@ai-gateway/config';
import { BillingRepository } from '../repositories/BillingRepository.js';
import { BillingService } from '../services/BillingService.js';

const logger = createLogger('billing-routes');

export async function billingRoutes(fastify: FastifyInstance) {
  const repo = new BillingRepository(fastify.pg);
  const service = new BillingService(repo, fastify);

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
        const result = await service.createSubscription(req.body.userId, req.body.planId);
        return reply.send(ok(result));
      } catch (err) {
        logger.error(err, 'Subscribe failed');
        return reply.status(500).send(fail(Errors.INTERNAL()));
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
        const rawBody = (req as any).rawBody as string | undefined;

        if (!signature || !rawBody) {
          return reply.status(400).send({ error: 'Missing signature or body' });
        }

        const expectedSig = createHmac('sha256', secret).update(rawBody).digest('hex');

        // Prevent timing attacks by using timingSafeEqual
        const signatureBuffer = Buffer.from(signature, 'utf8');
        const expectedSigBuffer = Buffer.from(expectedSig, 'utf8');

        if (signatureBuffer.length !== expectedSigBuffer.length || !timingSafeEqual(signatureBuffer, expectedSigBuffer)) {
          return reply.status(400).send({ error: 'Invalid signature' });
        }

        const razorpayEventId = req.headers['x-razorpay-event-id'] as string | undefined;
        if (!razorpayEventId) {
          return reply.status(400).send({ error: 'Missing event ID' });
        }

        const event = req.body as {
          event: string;
          payload: {
            subscription?: { entity: { id: string } };
            payment?: { entity: { amount: number } };
          };
        };

        logger.info({ event: event.event }, 'Razorpay webhook received');

        const result = await service.processWebhook(razorpayEventId, event.event, event.payload);
        return reply.send(result);
      } catch (err) {
        logger.error(err, 'Webhook processing failed');
        return reply.status(500).send({ error: 'Webhook failed' });
      }
    },
  );

  // GET /billing/subscription?userId=
  fastify.get('/subscription', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = req.query as { userId: string };
    if (!userId) return reply.status(400).send(fail(Errors.VALIDATION('userId query param is required')));

    const result = await service.getSubscription(userId);
    return reply.send(ok(result));
  });

  // POST /billing/cancel
  fastify.post(
    '/cancel',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { userId: string } }>, reply: FastifyReply) => {
      const { userId } = req.body;

      try {
        const result = await service.cancelSubscription(userId);
        if (!result) {
          return reply.status(404).send(fail(Errors.NOT_FOUND('Subscription')));
        }
        return reply.send(ok(result));
      } catch (err) {
        logger.error(err, 'Failed to cancel subscription');
        return reply.status(500).send(fail(Errors.INTERNAL()));
      }
    },
  );
}
