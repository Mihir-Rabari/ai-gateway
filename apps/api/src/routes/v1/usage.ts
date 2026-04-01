import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/requireAuth.js';

export const usageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/usage', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Usage'],
      description: 'Get user usage analytics dashboard stats',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    const res = await fetch(`${process.env['ANALYTICS_SERVICE_URL']}/analytics/dashboard?userId=${req.userId}`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  });
};
