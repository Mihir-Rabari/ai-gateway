import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/requireAuth.js';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/chat', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Gateway'],
      description: 'Send a request to an AI model',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['model', 'messages'],
        properties: {
          model: { type: 'string' },
          messages: { type: 'array' },
          maxTokens: { type: 'number' },
          appId: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    // Forward to gateway with user's token
    const authHeader = req.headers['authorization'] as string;
    const body = req.body as { appId?: string };
    const res = await fetch(`${process.env['GATEWAY_URL']}/gateway/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-App-Id': body.appId ?? 'api-direct',
      },
      body: JSON.stringify(req.body),
    });

    // Check if the response is JSON, sometimes proxy targets might return plain text or HTML on errors
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return reply.status(res.status).send(data);
    } else {
      const text = await res.text();
      return reply.status(res.status).send(text);
    }
  });
};
