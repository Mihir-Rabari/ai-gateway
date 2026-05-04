import fp from 'fastify-plugin';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
  }
}

/**
 * Shared Fastify PostgreSQL plugin.
 *
 * Connects to the database specified by the `DATABASE_URL` environment variable
 * and decorates the Fastify instance with a `pg` property (a `pg.Pool`).
 *
 * Pool settings: `max: 10`, `idleTimeoutMillis: 30 000`, `connectionTimeoutMillis: 2 000`.
 *
 * The pool is gracefully ended in the `onClose` hook.
 */
export const postgresPlugin = fp(async (fastify: FastifyInstance) => {
  const pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const client = await pool.connect();
  client.release();

  fastify.decorate('pg', pool);
  fastify.addHook('onClose', async () => { await pool.end(); });
  fastify.log.info('✅ PostgreSQL connected');
});
