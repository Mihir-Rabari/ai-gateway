import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getBillingConfig } from '@ai-gateway/config';
import { createLogger, getFastifyLoggerOptions, postgresPlugin, redisPlugin, kafkaPlugin, errorHandlerPlugin } from '@ai-gateway/utils';
import { billingRoutes } from './routes/billingRoutes.js';

const logger = createLogger('billing-service');
const config = getBillingConfig();
const app = Fastify({ logger: getFastifyLoggerOptions() });

// Custom content type parser to capture raw request body for signature verification
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    const json = JSON.parse(body.toString());
    (req as any).rawBody = body.toString();
    done(null, json);
  } catch (err) {
    (err as any).statusCode = 400;
    done(err as Error, undefined);
  }
});

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
  await app.register(billingRoutes, { prefix: '/billing' });
  app.get('/health', async () => ({ status: 'ok', service: 'billing-service' }));

  await app.register(errorHandlerPlugin);

  await app.listen({ port: config.BILLING_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`💳 Billing service running on port ${config.BILLING_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start billing service');
  process.exit(1);
});
