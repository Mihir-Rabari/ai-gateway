import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getCreditConfig } from '@ai-gateway/config';
import { createLogger, getFastifyLoggerOptions } from '@ai-gateway/utils';
import { postgresPlugin } from './plugins/postgres.js';
import { redisPlugin } from './plugins/redis.js';
import { kafkaPlugin } from './plugins/kafka.js';
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

  app.setErrorHandler((error, _req, reply) => {
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

  await app.listen({ port: config.CREDIT_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`💰 Credit service running on port ${config.CREDIT_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start credit service');
  process.exit(1);
});
