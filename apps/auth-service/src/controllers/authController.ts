import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { ok, fail, Errors, createLogger, type GatewayError } from '@ai-gateway/utils';
import { AuthService } from '../services/authService.js';
import { authEvents } from '../events/authEvents.js';

const logger = createLogger('auth-controller');

export class AuthController {
  private readonly authService: AuthService;

  constructor(db: Pool, redis: Redis) {
    this.authService = new AuthService(db, redis);
  }

  async signup(
    req: FastifyRequest<{ Body: { email: string; name: string; password: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await this.authService.signup(req.body);

      const fastify = req.server as { kafka: { publish: (topic: string, msg: object) => Promise<void> } };
      void authEvents.userCreated(fastify.kafka.publish, result.user.id, result.user.email).catch(
        (e: unknown) => logger.error(e, 'Failed to publish user.created event'),
      );

      return reply.status(201).send(ok(result));
    } catch (err) {
      logger.error({ err, email: req.body.email }, 'Signup failed');
      return reply
        .status((err as GatewayError).statusCode ?? 500)
        .send(fail(err as GatewayError));
    }
  }

  async login(
    req: FastifyRequest<{ Body: { email: string; password: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await this.authService.login(req.body);
      const fastify = req.server as { kafka: { publish: (topic: string, msg: object) => Promise<void> } };
      void authEvents.userLogin(fastify.kafka.publish, result.user.id).catch(
        (e: unknown) => logger.error(e, 'Failed to publish user.login event'),
      );
      return reply.send(ok(result));
    } catch (err) {
      logger.error({ err, email: req.body.email }, 'Login failed');
      return reply
        .status((err as GatewayError).statusCode ?? 401)
        .send(fail(err as GatewayError));
    }
  }

  async refresh(
    req: FastifyRequest<{ Body: { refreshToken: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const tokens = await this.authService.refresh(req.body.refreshToken);
      return reply.send(ok(tokens));
    } catch (err) {
      return reply
        .status((err as GatewayError).statusCode ?? 401)
        .send(fail(err as GatewayError));
    }
  }

  async logout(req: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) throw Errors.INVALID_TOKEN();

      const token = authHeader.slice(7);
      const fastify = req.server as { kafka: { publish: (topic: string, msg: object) => Promise<void> } };
      const payload = await this.authService.validateToken(token);
      await this.authService.logout(payload.userId);

      void authEvents.userLogout(fastify.kafka.publish, payload.userId).catch(
        (e: unknown) => logger.error(e, 'Failed to publish user.logout event'),
      );

      return reply.send(ok({ message: 'Logged out successfully' }));
    } catch (err) {
      return reply
        .status((err as GatewayError).statusCode ?? 401)
        .send(fail(err as GatewayError));
    }
  }

  async me(req: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) throw Errors.INVALID_TOKEN();

      const token = authHeader.slice(7);
      const user = await this.authService.getMe(token);
      return reply.send(ok(user));
    } catch (err) {
      return reply
        .status((err as GatewayError).statusCode ?? 401)
        .send(fail(err as GatewayError));
    }
  }
}
