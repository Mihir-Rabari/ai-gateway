import type { FastifyPluginAsync } from 'fastify';
import { requireAuth } from '../../middleware/requireAuth.js';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  const gatewayUrl = process.env['GATEWAY_URL'] ?? 'http://localhost:3002';

  fastify.post('/chat', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Gateway'],
      description: 'Send a request to an AI model',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['model', 'messages'],
        properties: {
          model: { type: 'string' },
          messages: { type: 'array' },
          maxTokens: { type: 'number' },
          stream: { type: 'boolean' },
          appId: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    req.log.info(`[API Trace] Incoming /chat request. RequestID: ${req.id}`);
    try {
      // Forward to gateway with user's token
      const authHeader = req.headers['authorization'] as string;
      const body = req.body as { appId?: string };
      const incomingAppKey = (req.headers['x-api-key'] ?? req.headers['x-app-key']) as string | undefined;
      const incomingAppToken = req.headers['x-app-token'] as string | undefined;

      let res: Response;
      try {
        res = await fetch(`${gatewayUrl}/gateway/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
            'X-App-Id': body.appId ?? 'api-direct',
            ...(incomingAppKey ? { 'X-Api-Key': incomingAppKey } : {}),
            ...(incomingAppToken ? { 'X-App-Token': incomingAppToken } : {}),
          },
          body: JSON.stringify(req.body),
        });
      } catch (fetchErr) {
        req.log.error({ err: fetchErr, gatewayUrl }, `[API Trace] Fetch failed to Gateway`);
        return reply.status(503).send({
          success: false,
          error: { code: 'GATEWAY_UNREACHABLE', message: 'AI Gateway service is unavailable. Please try again.', statusCode: 503 },
        });
      }

      req.log.info(`[API Trace] Gateway response received. Status: ${res.status}, Content-Type: ${res.headers.get('content-type')}`);

      const contentType = res.headers.get('content-type');

      if (contentType && contentType.includes('text/event-stream')) {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');

        reply.hijack();

        Object.assign(reply.raw, {
          flushHeaders() {
            if (!reply.raw.headersSent) {
              reply.raw.writeHead(res.status);
            }
          }
        });
        (reply.raw as any).flushHeaders();

        if (res.body) {
          let chunkCount = 0;
          for await (const chunk of res.body as any) {
            chunkCount++;
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            if (chunkCount === 1) {
              req.log.info(`[API Trace] First stream chunk received. Length: ${buffer.length}`);
            }
            reply.raw.write(buffer);
          }
          req.log.info(`[API Trace] Stream body ended. Total chunks: ${chunkCount}`);
        }
        reply.raw.end();
        return;
      }

      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        return reply.status(res.status).send(data);
      } else {
        // Gateway returned non-JSON (HTML error page, plain text, etc.)
        const text = await res.text();
        if (!res.ok) {
          return reply.status(res.status).send({
            success: false,
            error: { code: 'GATEWAY_ERROR', message: text || 'Gateway returned an unexpected response', statusCode: res.status },
          });
        }
        return reply.status(res.status).send(text);
      }
    } catch (err) {
      req.log.error({ err }, 'Failed to process chat request');
      return reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL', message: 'Unexpected server error', statusCode: 500 },
      });
    }
  });
};
