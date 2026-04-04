import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/requireAuth.js';

export const usageRoutes: FastifyPluginAsync = async (fastify) => {
  const getUsageSummary = async (req: Parameters<typeof requireAuth>[0], reply: Parameters<typeof requireAuth>[1]) => {
    const res = await fetch(`${process.env['ANALYTICS_SERVICE_URL']}/analytics/dashboard?userId=${req.userId}`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  };

  const routeConfig = {
    preHandler: [requireAuth],
    schema: {
      tags: ['Usage'],
      description: 'Get user usage analytics dashboard stats',
      security: [{ bearerAuth: [] }],
    },
  };

  fastify.get('/usage', routeConfig, getUsageSummary);
  fastify.get('/usage/summary', routeConfig, getUsageSummary);
};
