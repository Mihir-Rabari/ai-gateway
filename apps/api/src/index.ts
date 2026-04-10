import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { createLogger } from '@ai-gateway/utils';

const logger = createLogger('api');
const app = Fastify({ logger: false, genReqId: () => `req_${Date.now()}` });

async function bootstrap() {
  const loggerM = await import('./middleware/requestLogger.js');
  await app.register(loggerM.requestLogger);

  // CORS
  await app.register(cors, {
    origin: '*',
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Authorization',
      'X-App-Id', 'x-app-id',
      'X-App-Token', 'x-app-token',
      'X-Api-Key', 'x-api-key',
      'X-App-Key', 'x-app-key',
    ],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    timeWindow: Number(process.env['RATE_LIMIT_WINDOW_MS'] ?? 60000),
  });

  // Swagger
  await app.register(swagger, {
    openapi: {
      info: { title: 'AI Gateway API', version: '1.0.0', description: 'Public API for AI Gateway' },
      servers: [{ url: process.env['API_URL'] ?? 'http://localhost:3001' }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  // Routes
  const healthM = await import('./routes/health.js');
  await app.register(healthM.healthRoute);

  const meM = await import('./routes/v1/me.js');
  await app.register(meM.meRoutes, { prefix: '/api/v1' });

  const chatM = await import('./routes/v1/chat.js');
  await app.register(chatM.chatRoutes, { prefix: '/api/v1' });

  const creditsM = await import('./routes/v1/credits.js');
  await app.register(creditsM.creditRoutes, { prefix: '/api/v1' });

  const usageM = await import('./routes/v1/usage.js');
  await app.register(usageM.usageRoutes, { prefix: '/api/v1' });

  const modelsM = await import('./routes/v1/models.js');
  await app.register(modelsM.modelRoutes, { prefix: '/api/v1' });

  const appsM = await import('./routes/v1/apps.js');
  await app.register(appsM.appRoutes, { prefix: '/api/v1' });

  const billingM = await import('./routes/v1/billing.js');
  await app.register(billingM.billingRoutes, { prefix: '/api/v1' });


  const developersM = await import('./routes/v1/developers.js');
  await app.register(developersM.developerRoutes, { prefix: '/api/v1' });

  // Security Headers
  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('Content-Security-Policy', "default-src 'none'");
    reply.header('X-XSS-Protection', '1; mode=block');
  });


  await app.listen({ port: Number(process.env['API_PORT'] ?? 3001), host: '0.0.0.0' });
  logger.info(`🚀 API service running on port ${process.env['API_PORT'] ?? 3001}`);
}

bootstrap().catch((err) => { logger.error(err, 'API start failed'); process.exit(1); });
