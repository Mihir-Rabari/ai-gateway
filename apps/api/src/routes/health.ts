import type { FastifyPluginAsync } from 'fastify';

export const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      description: 'API Health Check',
    },
  }, async (req, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });
};
