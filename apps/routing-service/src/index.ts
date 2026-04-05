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
        const service = new RoutingService(app.kafka.publish.bind(app.kafka), app.redis);
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
    const service = new RoutingService(app.kafka.publish.bind(app.kafka), app.redis);
    const providers = await service.getProvidersHealth();
    return reply.send(ok({ providers }));
  });

  app.get('/health', async () => ({ status: 'ok', service: 'routing-service' }));

  await app.listen({ port: config.ROUTING_SERVICE_PORT, host: '0.0.0.0' });
  logger.info(`🤖 Routing service running on port ${config.ROUTING_SERVICE_PORT}`);
}

bootstrap().catch((err) => {
  logger.error(err, 'Failed to start routing service');
  process.exit(1);
});
