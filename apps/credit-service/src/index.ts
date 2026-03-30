import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getCreditConfig } from '@ai-gateway/config';
import { createLogger } from '@ai-gateway/utils';
import { postgresPlugin } from './plugins/postgres.js';
import { redisPlugin } from './plugins/redis.js';
import { kafkaPlugin } from './plugins/kafka.js';
import { creditRoutes } from './routes/creditRoutes.js';

const logger = createLogger('credit-service');
const config = getCreditConfig();
const app = Fastify({ logger: false });

async function bootstrap() {
  await app.register(cors);
  await app.register(postgresPlugin);
  await app.register(redisPlugin);
  await app.register(kafkaPlugin);
  await app.register(creditRoutes, { prefix: '/credits' });

  app.get('/health', async () => ({ status: 'ok', service: 'credit-service' }));

  app.setErrorHandler((error, _req, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    reply.status(statusCode).send({
      success: false,
      error: {
        code: (error as { code?: string }).code ?? 'INTERNAL',
        message: error.message,
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
