import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getGatewayConfig } from '@ai-gateway/config';
import { createLogger } from '@ai-gateway/utils';
import { postgresPlugin } from './plugins/postgres.js';
import { redisPlugin } from './plugins/redis.js';
import { kafkaPlugin } from './plugins/kafka.js';
import { gatewayRoutes } from './routes/gatewayRoutes.js';

const logger = createLogger('gateway');
const config = getGatewayConfig();

const app = Fastify({ logger: false });

async function bootstrap() {
  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000', 'http://localhost:3009'],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  await app.register(postgresPlugin);
  await app.register(redisPlugin);
  await app.register(kafkaPlugin);

  await app.register(gatewayRoutes, { prefix: '/gateway' });

  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Request-Id', req.id);
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('Content-Security-Policy', "default-src 'none'");
    reply.header('X-XSS-Protection', '1; mode=block');
  });

  app.get('/health', async () => ({ status: 'ok', service: 'gateway' }));

  app.setErrorHandler((error, _req, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    reply.status(statusCode).send({
      success: false,
      error: { code: (error as { code?: string }).code ?? 'INTERNAL', message: (error as { message?: string }).message ?? 'Unknown error', statusCode },
    });
  });

  await app.listen({ port: config.GATEWAY_PORT, host: '0.0.0.0' });
  logger.info(`🚪 Gateway running on port ${config.GATEWAY_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start gateway');
  process.exit(1);
});
