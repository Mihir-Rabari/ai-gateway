import type { FastifyPluginAsync } from 'fastify';
import pg from 'pg';
import { requireAuth } from '../../middleware/requireAuth.js';
import { ok, fail } from '@ai-gateway/utils';

const pool = new pg.Pool({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://gateway_user:gateway_pass@localhost:5432/ai_gateway',
});

let developerSchemaReady: Promise<void> | null = null;

async function ensureDeveloperSchema(): Promise<void> {
  if (!developerSchemaReady) {
    developerSchemaReady = (async () => {
      await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS developers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS dev_wallets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          developer_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          balance NUMERIC(12, 4) NOT NULL DEFAULT 0,
          total_earned NUMERIC(12, 4) NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query('CREATE INDEX IF NOT EXISTS idx_developers_user_id ON developers (user_id)');
    })().catch((err) => {
      developerSchemaReady = null;
      throw err;
    });
  }

  await developerSchemaReady;
}

export const developerRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/developers/status
   * Returns whether the authenticated user is enrolled as a developer.
   */
  fastify.get('/developers/status', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Developers'],
      description: 'Check if the current user is enrolled as a developer',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    try {
      await ensureDeveloperSchema();

      const result = await pool.query(
        'SELECT id, enrolled_at FROM developers WHERE user_id = $1',
        [req.userId],
      );
      const isDeveloper = (result.rowCount ?? 0) > 0;
      return reply.send(ok({ isDeveloper, enrolledAt: result.rows[0]?.enrolled_at ?? null }));
    } catch (err) {
      req.log.error({ err }, 'Failed to fetch developer status');
      return reply.status(500).send(fail({ name: 'Error', code: 'DEV_STATUS_ERR', message: 'Failed to fetch developer status', statusCode: 500 }));
    }
  });

  /**
   * POST /api/v1/developers/enroll
   * Enroll the authenticated user as a developer. Idempotent — safe to call multiple times.
   */
  fastify.post('/developers/enroll', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Developers'],
      description: 'Enroll the current user as a developer',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    try {
      await ensureDeveloperSchema();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `INSERT INTO developers (user_id)
           VALUES ($1)
           ON CONFLICT (user_id) DO NOTHING`,
          [req.userId],
        );

        await client.query(
          `INSERT INTO dev_wallets (developer_id)
           VALUES ($1)
           ON CONFLICT (developer_id) DO NOTHING`,
          [req.userId],
        );

        const enrolledResult = await client.query(
          'SELECT enrolled_at FROM developers WHERE user_id = $1',
          [req.userId],
        );

        await client.query('COMMIT');
        return reply.send(ok({
          enrolled: true,
          enrolledAt: enrolledResult.rows[0]?.enrolled_at ?? null,
        }));
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      req.log.error({ err }, 'Failed to enroll developer');
      return reply.status(500).send(fail({ name: 'Error', code: 'DEV_ENROLL_ERR', message: 'Failed to enroll as developer', statusCode: 500 }));
    }
  });
};
