import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ok, fail, type GatewayError } from '@ai-gateway/utils';
import { CreditService } from '../services/creditService.js';

export async function creditRoutes(fastify: FastifyInstance) {
  const getService = () =>
    new CreditService(fastify.pg, fastify.redis, fastify.kafka.publish.bind(fastify.kafka));

  // GET /credits/balance
  fastify.get(
    '/balance',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'string' } },
        },
      },
    },
    async (req: FastifyRequest<{ Querystring: { userId: string } }>, reply: FastifyReply) => {
      try {
        const balance = await getService().getBalance(req.query.userId);
        return reply.send(ok({ userId: req.query.userId, balance }));
      } catch (err) {
        return reply.status((err as GatewayError).statusCode ?? 500).send(fail(err as GatewayError));
      }
    },
  );

  // POST /credits/check
  fastify.post(
    '/check',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'requiredCredits'],
          properties: { userId: { type: 'string' }, requiredCredits: { type: 'number' } },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { userId: string; requiredCredits: number } }>, reply: FastifyReply) => {
      try {
        const result = await getService().check(req.body.userId, req.body.requiredCredits);
        return reply.send(ok(result));
      } catch (err) {
        return reply.status((err as GatewayError).statusCode ?? 500).send(fail(err as GatewayError));
      }
    },
  );

  // POST /credits/lock
  fastify.post(
    '/lock',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'requestId', 'amount'],
          properties: { userId: { type: 'string' }, requestId: { type: 'string' }, amount: { type: 'number' } },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { userId: string; requestId: string; amount: number } }>, reply: FastifyReply) => {
      try {
        await getService().lock(req.body.userId, req.body.requestId, req.body.amount);
        return reply.send(ok({ locked: true }));
      } catch (err) {
        return reply.status((err as GatewayError).statusCode ?? 500).send(fail(err as GatewayError));
      }
    },
  );

  // POST /credits/confirm
  fastify.post(
    '/confirm',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'requestId'],
          properties: { userId: { type: 'string' }, requestId: { type: 'string' } },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { userId: string; requestId: string } }>, reply: FastifyReply) => {
      try {
        const result = await getService().confirm(req.body.userId, req.body.requestId);
        return reply.send(ok(result));
      } catch (err) {
        return reply.status((err as GatewayError).statusCode ?? 500).send(fail(err as GatewayError));
      }
    },
  );

  // POST /credits/release
  fastify.post(
    '/release',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'requestId'],
          properties: { userId: { type: 'string' }, requestId: { type: 'string' } },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { userId: string; requestId: string } }>, reply: FastifyReply) => {
      try {
        await getService().release(req.body.userId, req.body.requestId);
        return reply.send(ok({ released: true }));
      } catch (err) {
        return reply.status((err as GatewayError).statusCode ?? 500).send(fail(err as GatewayError));
      }
    },
  );

  // POST /credits/add
  fastify.post(
    '/add',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'amount', 'reason'],
          properties: {
            userId: { type: 'string' },
            amount: { type: 'number' },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { userId: string; amount: number; reason: string } }>, reply: FastifyReply) => {
      try {
        const result = await getService().addCredits(req.body.userId, req.body.amount, req.body.reason);
        return reply.send(ok(result));
      } catch (err) {
        return reply.status((err as GatewayError).statusCode ?? 500).send(fail(err as GatewayError));
      }
    },
  );

  // GET /credits/transactions
  fastify.get(
    '/transactions',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
            limit: { type: 'number', default: 20 },
            offset: { type: 'number', default: 0 },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Querystring: { userId: string; limit: number; offset: number } }>, reply: FastifyReply) => {
      try {
        const { userId, limit, offset } = req.query;
        const transactions = await getService().getTransactions(userId, limit, offset);
        return reply.send(ok({ transactions, userId }));
      } catch (err) {
        return reply.status((err as GatewayError).statusCode ?? 500).send(fail(err as GatewayError));
      }
    },
  );
}
