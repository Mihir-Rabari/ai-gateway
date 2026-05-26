import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/requireAuth.js';

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  const billingServiceUrl = process.env['BILLING_SERVICE_URL'] ?? 'http://localhost:3004';

  fastify.get('/billing/plans', {
    schema: {
      tags: ['Billing'],
      description: 'Get available subscription plans',
    },
  }, async (req, reply) => {
    const res = await fetch(`${billingServiceUrl}/billing/plans`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  });

  fastify.post('/billing/subscribe', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Billing'],
      description: 'Create a Razorpay subscription',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['planId'],
        properties: {
          planId: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const authHeader = req.headers['authorization'] as string;
    const { planId } = req.body as { planId: 'pro' | 'max' };
    const res = await fetch(`${billingServiceUrl}/billing/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ userId: req.userId, planId }),
    });

    const data = await res.json();
    return reply.status(res.status).send(data);
  });

  fastify.get('/billing/subscription', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Billing'],
      description: 'Get current user subscription',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    const authHeader = req.headers['authorization'] as string;
    const res = await fetch(
      `${billingServiceUrl}/billing/subscription?userId=${encodeURIComponent(req.userId)}`,
      {
        headers: { Authorization: authHeader },
      }
    );

    const data = await res.json();
    return reply.status(res.status).send(data);
  });

  fastify.post('/billing/cancel', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Billing'],
      description: 'Cancel current user subscription',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    const authHeader = req.headers['authorization'] as string;
    const res = await fetch(`${billingServiceUrl}/billing/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ userId: req.userId }),
    });

    const data = await res.json();
    return reply.status(res.status).send(data);
  });

  fastify.post('/billing/topup/order', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Billing'],
      description: 'Create a Razorpay prepaid order for wallet top-up',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number' },
        },
      },
    },
  }, async (req, reply) => {
    const authHeader = req.headers['authorization'] as string;
    const { amount } = req.body as { amount: number };
    const res = await fetch(`${billingServiceUrl}/billing/topup/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ userId: req.userId, amount }),
    });

    const data = await res.json();
    return reply.status(res.status).send(data);
  });

  fastify.post('/billing/topup/verify', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Billing'],
      description: 'Verify Razorpay prepaid wallet top-up payment',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['razorpayPaymentId', 'razorpayOrderId', 'razorpaySignature'],
        properties: {
          razorpayPaymentId: { type: 'string' },
          razorpayOrderId: { type: 'string' },
          razorpaySignature: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const authHeader = req.headers['authorization'] as string;
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body as {
      razorpayPaymentId: string;
      razorpayOrderId: string;
      razorpaySignature: string;
    };
    const res = await fetch(`${billingServiceUrl}/billing/topup/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        userId: req.userId,
      }),
    });

    const data = await res.json();
    return reply.status(res.status).send(data);
  });
};
