import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getRoutingConfig } from '@ai-gateway/config';
import { createLogger, ok, fail, type GatewayError } from '@ai-gateway/utils';
import { kafkaPlugin } from './plugins/kafka.js';
import { redisPlugin } from './plugins/redis.js';
import { RoutingService, buildModelConfigFromEnv, validateModelConfig } from './services/routingService.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Message } from '@ai-gateway/types';
import type { ModelConfig } from './services/routingService.js';

const logger = createLogger('routing-service');
const config = getRoutingConfig();
const app = Fastify({ logger: false });

// Module-level model config cache. Loaded from Redis on startup and updated
// in-place when the PUT /internal/routing/models/config endpoint is called.
// Using an in-memory reference avoids a Redis round-trip on every request
// while still propagating updates to all replicas (replicas must restart or
// receive a config update via the PUT endpoint).
let activeModelConfig: ModelConfig = buildModelConfigFromEnv();

async function bootstrap() {
  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000', 'http://localhost:3009'],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(redisPlugin);
  await app.register(kafkaPlugin);

  // ── Model config bootstrap ────────────────────────────────────────────
  // Prefer a config stored in Redis (updated via the admin endpoint) so
  // that it survives service restarts. Fall back to env-var / defaults.
  const storedConfig = await RoutingService.loadModelConfig(app.redis);
  if (storedConfig) {
    activeModelConfig = storedConfig;
    logger.info('Model config loaded from Redis');
  } else {
    // Seed Redis so future replicas or restarts pick up the same starting config.
    await RoutingService.saveModelConfigToRedis(app.redis, activeModelConfig);
    logger.info('Model config seeded into Redis from env/defaults');
  }

  app.post(
    '/internal/routing/route',
    {
      schema: {
        body: {
          type: 'object',
          required: ['requestId', 'model', 'messages'],
          properties: {
            requestId: { type: 'string' },
            model: { type: 'string' },
            messages: { type: 'array' },
            maxTokens: { type: 'number' },
            temperature: { type: 'number' },
            stream: { type: 'boolean' },
          },
        },
      },
    },
    async (
      req: FastifyRequest<{
        Body: {
          requestId: string;
          model: string;
          messages: Message[];
          maxTokens?: number;
          temperature?: number;
          stream?: boolean;
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const service = new RoutingService(app.kafka.publish.bind(app.kafka), app.redis, {}, activeModelConfig);
        const result = await service.route(req.body);

        if (req.body.stream) {
          reply.raw.setHeader('Content-Type', 'text/event-stream');
          reply.raw.setHeader('Cache-Control', 'no-cache');
          reply.raw.setHeader('Connection', 'keep-alive');
          reply.hijack();
          
          Object.assign(reply.raw, {
            flushHeaders() {
              if (!reply.raw.headersSent) {
                reply.raw.writeHead(200);
              }
            }
          });
          (reply.raw as any).flushHeaders();
          
          for await (const chunk of result as AsyncIterable<string>) {
            reply.raw.write(chunk);
          }
          reply.raw.end();
          return;
        }

        return reply.send(ok(result));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 500)
          .send(fail(err as GatewayError));
      }
    },
  );

  app.get('/internal/routing/providers', async (_req, reply) => {
    const service = new RoutingService(app.kafka.publish.bind(app.kafka), app.redis, {}, activeModelConfig);
    const providers = await service.getProvidersHealth();
    return reply.send(ok({ providers }));
  });

  // GET /internal/routing/models — return the current model list derived from
  // the active model config so other services (e.g. the gateway) don't need
  // their own hardcoded model lists.
  app.get('/internal/routing/models', async (_req, reply) => {
    const models = Object.keys(activeModelConfig.modelProvider);
    return reply.send(ok({ models }));
  });

  // PUT /internal/routing/models/config — update the model config.
  // The new config is validated, saved to Redis for persistence, and the
  // in-memory cache is updated so changes take effect immediately.
  app.put(
    '/internal/routing/models/config',
    {
      schema: {
        body: {
          type: 'object',
          required: ['modelProvider'],
          properties: {
            modelProvider: { type: 'object' },
            fallbackMap: { type: 'object' },
          },
        },
      },
    },
    async (
      req: FastifyRequest<{ Body: { modelProvider: Record<string, string>; fallbackMap?: Record<string, string> } }>,
      reply: FastifyReply,
    ) => {
      const incoming: ModelConfig = {
        modelProvider: req.body.modelProvider as Record<string, import('@ai-gateway/types').ProviderName>,
        fallbackMap: req.body.fallbackMap ?? {},
      };
      const validated = validateModelConfig(incoming);
      await RoutingService.saveModelConfigToRedis(app.redis, validated);
      activeModelConfig = validated;
      return reply.send(ok({ message: 'Model config updated', config: validated }));
    },
  );

  app.get('/health', async () => ({ status: 'ok', service: 'routing-service' }));

  await app.listen({ port: config.ROUTING_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`🤖 Routing service running on port ${config.ROUTING_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start routing service');
  process.exit(1);
});
