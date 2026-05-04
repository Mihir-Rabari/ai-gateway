import type { FastifyPluginAsync } from 'fastify';
import { createLogger } from '@ai-gateway/utils';

const logger = createLogger('api');

export const requestLogger: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (req, reply) => {
    (req as any).startTime = process.hrtime.bigint();
    const appHeader = req.headers['x-app-id'] ?? 'unknown';
    logger.info(
      {
        reqId: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        appId: appHeader,
      },
      'Incoming Request',
    );
  });

  fastify.addHook('onResponse', async (req, reply) => {
    const startTime = (req as any).startTime as bigint;
    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1_000_000;

    reply.header('X-Response-Time', `${latencyMs.toFixed(2)}ms`);

    logger.info(
      {
        reqId: req.id,
        method: req.method,
        url: req.url,
        statusCode: reply.statusCode,
        latencyMs: latencyMs.toFixed(2),
      },
      'Request Completed',
    );
  });

  fastify.addHook('onError', async (req, reply, error) => {
    logger.error(
      {
        reqId: req.id,
        method: req.method,
        url: req.url,
        err: error,
      },
      'Request Failed',
    );
  });
};

(requestLogger as any)[Symbol.for('skip-override')] = true;
