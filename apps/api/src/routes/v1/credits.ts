import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/requireAuth.js';

export const creditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/credits', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Credits'],
      description: 'Get current user credit balance',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    const res = await fetch(`${process.env['CREDIT_SERVICE_URL']}/credits/balance?userId=${req.userId}`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  });

  fastify.get('/credits/transactions', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Credits'],
      description: 'Get user credit transaction history',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 },
        },
      },
    },
  }, async (req, reply) => {
    const { limit = 50, offset = 0 } = req.query as { limit?: number; offset?: number };
    const res = await fetch(`${process.env['CREDIT_SERVICE_URL']}/credits/transactions?userId=${req.userId}&limit=${limit}&offset=${offset}`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  });
};
