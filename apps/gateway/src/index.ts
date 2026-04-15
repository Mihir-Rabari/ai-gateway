import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getGatewayConfig } from '@ai-gateway/config';
import {
  createLogger,
  getFastifyLoggerOptions,
  redisPlugin,
  kafkaPlugin,
  errorHandlerPlugin,
  securityHeadersPlugin,
} from '@ai-gateway/utils';
import { gatewayRoutes } from './routes/gatewayRoutes.js';

const logger = createLogger('gateway');
const config = getGatewayConfig();

const app = Fastify({ logger: getFastifyLoggerOptions() });

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

  await app.register(securityHeadersPlugin);

  app.get('/health', async () => ({ status: 'ok', service: 'gateway' }));

  await app.register(errorHandlerPlugin);

  await app.listen({ port: config.GATEWAY_PORT, host: '0.0.0.0' });
  logger.info(`🚪 Gateway running on port ${config.GATEWAY_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start gateway');
  process.exit(1);
});
