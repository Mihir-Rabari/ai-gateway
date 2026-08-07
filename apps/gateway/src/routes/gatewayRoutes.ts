import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ok, fail, type GatewayError } from '@ai-gateway/utils';
import { GatewayService } from '../services/gatewayService.js';
import type { Message } from '@ai-gateway/types';

export async function gatewayRoutes(fastify: FastifyInstance) {
  // Create one shared GatewayService instance per server lifetime so that
  // circuit-breaker state (and the token cache) persists across requests.
  const service = new GatewayService({
    authServiceUrl: process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3003',
    creditServiceUrl: process.env['CREDIT_SERVICE_URL'] ?? 'http://localhost:3005',
    routingServiceUrl: process.env['ROUTING_SERVICE_URL'] ?? 'http://localhost:3006',
    kafkaPublish: fastify.kafka.publish.bind(fastify.kafka),
    redis: fastify.redis,
    tokenCacheTtlSeconds: process.env['TOKEN_CACHE_TTL_SECONDS']
      ? Number(process.env['TOKEN_CACHE_TTL_SECONDS'])
      : 60,
  });

  // POST /gateway/request
  fastify.post(
    '/request',
    {
      schema: {
        body: {
          type: 'object',
          required: ['model', 'messages'],
          properties: {
            model: { type: 'string' },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                  content: { type: 'string' },
                },
              },
            },
            maxTokens: { type: 'number' },
            temperature: { type: 'number' },
            stream: { type: 'boolean' },
          },
        },
      },
    },
    async (
      req: FastifyRequest<{
        Body: { model: string; messages: Message[]; maxTokens?: number; temperature?: number; stream?: boolean; };
        Headers: { authorization?: string; 'x-app-id'?: string; 'x-api-key'?: string; 'x-app-key'?: string; 'x-app-token'?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send({
            success: false,
            error: { code: 'AUTH_001', message: 'Missing user token', statusCode: 401 },
          });
        }

        const token = authHeader.slice(7);
        const appId = req.headers['x-app-id'] ?? 'unknown';
        const appApiKey = req.headers['x-api-key'] ?? req.headers['x-app-key'];
        const appJwt = req.headers['x-app-token'] as string | undefined;

        if (req.body.stream) {
          const stream = await service.processStreamRequest({
            token,
            appId,
            appApiKey,
            appJwt,
            model: req.body.model,
            messages: req.body.messages,
            maxTokens: req.body.maxTokens,
            temperature: req.body.temperature,
          });

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
          
          for await (const chunk of stream) {
            reply.raw.write(chunk);
          }
          reply.raw.end();
          return;
        }

        const result = await service.processRequest({
          token,
          appId,
          appApiKey,
          appJwt,
          model: req.body.model,
          messages: req.body.messages,
          maxTokens: req.body.maxTokens,
          temperature: req.body.temperature,
        });

        return reply.send(ok(result));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 500)
          .send(fail(err as GatewayError));
      }
    },
  );

  // GET /gateway/models — delegates to routing-service so the list is always
  // in sync with the active model config stored there.
  fastify.get('/models', async (_req, reply) => {
    try {
      const routingServiceUrl = process.env['ROUTING_SERVICE_URL'] ?? 'http://localhost:3006';
      const res = await fetch(`${routingServiceUrl}/internal/routing/models`, {
        headers: {
          'X-Internal-Secret': process.env['INTERNAL_SERVICE_SECRET'] ?? '',
        },
      });
      if (res.ok) {
        const body = await res.json() as { success: boolean; data: { models: string[] } };
        return reply.send(ok({ models: body.data.models }));
      }
    } catch {
      // Routing service unavailable — fall through to hardcoded defaults.
    }
    // Fallback: return empty list when routing service is unavailable
    return reply.send(ok({
      models: [],
    }));
  });

  // GET /gateway/status
  fastify.get('/status', async (_req, reply) => {
    return reply.send(ok({
      status: 'healthy',
      providers: [],
      timestamp: new Date().toISOString(),
    }));
  });
}
