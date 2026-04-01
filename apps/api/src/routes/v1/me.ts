import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/requireAuth.js';

export const meRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me', {
    preHandler: [requireAuth],
    schema: {
      tags: ['User'],
      description: 'Get current user information',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    // The auth middleware already validated the token and fetched user details.
    // It's available on req.userId, req.planId, req.userEmail.
    // Proxy to `auth-service`'s `GET /auth/me` to get full user data.

    const authHeader = req.headers['authorization'] as string;
    const res = await fetch(`${process.env['AUTH_SERVICE_URL']}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

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
