import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/requireAuth.js';

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/billing/plans', {
    schema: {
      tags: ['Billing'],
      description: 'Get available subscription plans',
    },
  }, async (req, reply) => {
    const res = await fetch(`${process.env['BILLING_SERVICE_URL']}/billing/plans`);
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
    const res = await fetch(`${process.env['BILLING_SERVICE_URL']}/billing/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(req.body),
    });

    const data = await res.json();
    return reply.status(res.status).send(data);
  });
};
