import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ok, fail, type GatewayError } from '@ai-gateway/utils';
import { AuthService } from '../services/authService.js';

export async function internalRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.pg, fastify.redis);

  /**
   * POST /internal/auth/validate
   * Used by the Gateway to validate user tokens
   */
  fastify.post(
    '/validate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token'],
          properties: { token: { type: 'string' } },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { token: string } }>, reply: FastifyReply) => {
      try {
        const payload = await authService.validateToken(req.body.token);
        return reply.send(
          ok({ valid: true, userId: payload.userId, planId: payload.planId, email: payload.email }),
        );
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 401)
          .send(fail(err as GatewayError));
      }
    },
  );
}
