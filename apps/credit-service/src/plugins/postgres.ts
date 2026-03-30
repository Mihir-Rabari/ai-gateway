import fp from 'fastify-plugin';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    pg: Pool;
  }
}

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
