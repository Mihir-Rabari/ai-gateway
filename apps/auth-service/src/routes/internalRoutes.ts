import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ok, fail, type GatewayError } from '@ai-gateway/utils';
import { AuthService } from '../services/authService.js';
import { AppValidationService } from '../services/appValidationService.js';
import { AppRepository } from '../repositories/appRepository.js';

export async function internalRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify.pg, fastify.redis);
  const appValidationService = new AppValidationService(
    new AppRepository(fastify.pg),
    fastify.redis,
    process.env['CLIENT_SECRET_ENCRYPTION_KEY'],
  );

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

  fastify.get(
    '/users/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const user = await authService.getUserById(req.params.id);
        return reply.send(ok(user));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 404)
          .send(fail(err as GatewayError));
      }
    },
  );

  /**
   * POST /internal/auth/apps/validate
   * Used by the Gateway to validate app access (JWT, API key, or active status).
   * Encapsulates all registered_apps logic so the Gateway never queries the DB directly.
   */
  fastify.post(
    '/apps/validate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['appId'],
          properties: {
            appId: { type: 'string' },
            appApiKey: { type: 'string' },
            appJwt: { type: 'string' },
          },
        },
      },
    },
    async (
      req: FastifyRequest<{ Body: { appId: string; appApiKey?: string; appJwt?: string } }>,
      reply: FastifyReply,
    ) => {
      const result = await appValidationService.validate(
        req.body.appId,
        req.body.appApiKey,
        req.body.appJwt,
      );
      return reply.send(ok({ result }));
    },
  );
}
