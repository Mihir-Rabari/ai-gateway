import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getGatewayConfig } from '@ai-gateway/config';
import { createLogger, redisPlugin, kafkaPlugin, errorHandlerPlugin } from '@ai-gateway/utils';
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

  await app.register(errorHandlerPlugin);

  await app.listen({ port: config.GATEWAY_PORT, host: '0.0.0.0' });
  logger.info(`🚪 Gateway running on port ${config.GATEWAY_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start gateway');
  process.exit(1);
});
