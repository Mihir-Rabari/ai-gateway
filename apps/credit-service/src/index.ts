import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getCreditConfig } from '@ai-gateway/config';
import { createLogger, getFastifyLoggerOptions, postgresPlugin, redisPlugin, kafkaPlugin, errorHandlerPlugin } from '@ai-gateway/utils';
import { creditRoutes } from './routes/creditRoutes.js';

const logger = createLogger('credit-service');
const config = getCreditConfig();
const app = Fastify({ logger: getFastifyLoggerOptions() });

async function bootstrap() {
  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000', 'http://localhost:3009'],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(postgresPlugin);
  await app.register(redisPlugin);
  await app.register(kafkaPlugin);
  await app.register(creditRoutes, { prefix: '/credits' });

  app.get('/health', async () => ({ status: 'ok', service: 'credit-service' }));

  await app.register(errorHandlerPlugin);

  await app.listen({ port: config.CREDIT_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`💰 Credit service running on port ${config.CREDIT_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start credit service');
  process.exit(1);
});
