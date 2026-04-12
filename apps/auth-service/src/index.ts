import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import rateLimit from '@fastify/rate-limit';
import { getAuthConfig } from '@ai-gateway/config';
import { createLogger, postgresPlugin, redisPlugin, kafkaPlugin, errorHandlerPlugin } from '@ai-gateway/utils';
import { authRoutes } from './routes/authRoutes.js';
import { internalRoutes } from './routes/internalRoutes.js';
import { oauthRoutes } from './routes/oauthRoutes.js';
import { startAuthAuditConsumer } from './events/authAuditConsumer.js';

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
  let auditConsumer: { disconnect: () => Promise<void> } | null = null;

  // ─── Plugins ───────────────────────────────────
  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000', 'http://localhost:3009'],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(formbody);

  await app.register(postgresPlugin);
  await app.register(redisPlugin);
  await app.register(kafkaPlugin);

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    redis: app.redis,
  });

  if (config.AUTH_EVENTS_CONSUMER_ENABLED) {
    auditConsumer = await startAuthAuditConsumer({
      db: app.pg,
      logger,
      clientId: 'auth-service-audit',
      brokers: process.env['KAFKA_BROKERS'],
      groupId: process.env['AUTH_AUDIT_CONSUMER_GROUP_ID'],
    });

    app.addHook('onClose', async () => {
      await auditConsumer?.disconnect();
    });
  }

  // ─── Routes ────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(internalRoutes, { prefix: '/internal/auth' });
  await app.register(oauthRoutes, { prefix: '/oauth' });

  // ─── Health Check ──────────────────────────────
  app.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));

  // ─── Error Handler ─────────────────────────────
  await app.register(errorHandlerPlugin);

  // ─── Start ─────────────────────────────────────
  await app.listen({ port: config.AUTH_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`🔐 Auth service running on port ${config.AUTH_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start auth service');
  process.exit(1);
});
