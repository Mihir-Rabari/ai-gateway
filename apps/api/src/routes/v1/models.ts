import type { FastifyPluginAsync } from 'fastify';

export const modelRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/models', {
    schema: {
      tags: ['Models'],
      description: 'Get list of available AI models',
    },
  }, async (req, reply) => {
    const res = await fetch(`${process.env['GATEWAY_URL']}/gateway/models`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  });
};
