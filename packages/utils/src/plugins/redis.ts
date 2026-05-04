import fp from 'fastify-plugin';
import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

/**
 * Shared Fastify Redis plugin.
 *
 * Connects to the Redis instance specified by the `REDIS_URL` environment
 * variable (default: `redis://localhost:6379`) and decorates the Fastify
 * instance with a `redis` property (an `ioredis` client).
 *
 * Options: `lazyConnect: false`, `maxRetriesPerRequest: 3`.
 *
 * The connection is gracefully closed via `redis.quit()` in the `onClose` hook.
 */
export const redisPlugin = fp(async (fastify: FastifyInstance) => {
  const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  });
  await redis.ping();
  fastify.decorate('redis', redis);
  fastify.addHook('onClose', async () => { await redis.quit(); });
  fastify.log.info('✅ Redis connected');
});
