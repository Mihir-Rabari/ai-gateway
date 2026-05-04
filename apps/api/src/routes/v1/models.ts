import type { FastifyPluginAsync } from 'fastify';

export const modelRoutes: FastifyPluginAsync = async (fastify) => {
  const gatewayUrl = process.env['GATEWAY_URL'] ?? 'http://localhost:3002';

  fastify.get('/models', {
    schema: {
      tags: ['Models'],
      description: 'Get list of available AI models',
    },
  }, async (req, reply) => {
    const res = await fetch(`${gatewayUrl}/gateway/models`);
    const data = await res.json();
    return reply.status(res.status).send(data);
  });
};
