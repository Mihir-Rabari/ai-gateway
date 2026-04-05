import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getAuthConfig } from '@ai-gateway/config';
import { createLogger } from '@ai-gateway/utils';
import { postgresPlugin } from './plugins/postgres.js';
import { redisPlugin } from './plugins/redis.js';
import { kafkaPlugin } from './plugins/kafka.js';
import { authRoutes } from './routes/authRoutes.js';
import { internalRoutes } from './routes/internalRoutes.js';

const logger = createLogger('auth-service');
const config = getAuthConfig();

const app = Fastify({
  logger: {
    level: process.env['LOG_LEVEL'] ?? 'info',
    transport:
      config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

async function bootstrap() {
  // ─── Plugins ───────────────────────────────────
  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
  });

  await app.register(postgresPlugin);
  await app.register(redisPlugin);
  await app.register(kafkaPlugin);

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    redis: app.redis,
  });

  // ─── Routes ────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(internalRoutes, { prefix: '/internal/auth' });

  // ─── Health Check ──────────────────────────────
  app.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));

  // ─── Error Handler ─────────────────────────────
  app.setErrorHandler((error, _req, reply) => {
    logger.error({ error }, 'Unhandled error');
    const appError = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = appError.statusCode ?? 500;
    reply.status(statusCode).send({
      success: false,
      error: {
        code: appError.code ?? 'INTERNAL',
        message: appError.message ?? 'Internal server error',
        statusCode,
      },
    });
  });

  // ─── Start ─────────────────────────────────────
  await app.listen({ port: config.AUTH_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`🔐 Auth service running on port ${config.AUTH_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start auth service');
  process.exit(1);
});
