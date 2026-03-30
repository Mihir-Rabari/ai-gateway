import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getRoutingConfig } from '@ai-gateway/config';
import { createLogger, ok, fail, type GatewayError } from '@ai-gateway/utils';
import { kafkaPlugin } from './plugins/kafka.js';
import { redisPlugin } from './plugins/redis.js';
import { RoutingService } from './services/routingService.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Message } from '@ai-gateway/types';

const logger = createLogger('routing-service');
const config = getRoutingConfig();
const app = Fastify({ logger: false });

async function bootstrap() {
  await app.register(cors);
  await app.register(redisPlugin);
  await app.register(kafkaPlugin);

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
        };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const service = new RoutingService(app.kafka.publish.bind(app.kafka));
        const result = await service.route(req.body);
        return reply.send(ok(result));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 500)
          .send(fail(err as GatewayError));
      }
    },
  );

  app.get('/internal/routing/providers', async (_req, reply) => {
    return reply.send(ok({
      providers: [
        { name: 'openai', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'], healthy: true },
        { name: 'anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'], healthy: true },
      ],
    }));
  });

  app.get('/health', async () => ({ status: 'ok', service: 'routing-service' }));

  await app.listen({ port: config.ROUTING_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`🤖 Routing service running on port ${config.ROUTING_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start routing service');
  process.exit(1);
});
