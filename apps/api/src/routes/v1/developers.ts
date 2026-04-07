import type { FastifyPluginAsync } from 'fastify';
import pg from 'pg';
import { requireAuth } from '../../middleware/requireAuth.js';
import { ok, fail } from '@ai-gateway/utils';

const pool = new pg.Pool({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://gateway_user:gateway_pass@localhost:5432/ai_gateway',
});

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
      const result = await pool.query(
        'SELECT id, enrolled_at FROM developers WHERE user_id = $1',
        [req.userId],
      );
      const isDeveloper = (result.rowCount ?? 0) > 0;
      return reply.send(ok({ isDeveloper, enrolledAt: result.rows[0]?.enrolled_at ?? null }));
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch developer status');
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
      await pool.query(
        `INSERT INTO developers (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [req.userId],
      );

      // Ensure a dev_wallet row exists for earnings tracking
      await pool.query(
        `INSERT INTO dev_wallets (developer_id)
         VALUES ($1)
         ON CONFLICT (developer_id) DO NOTHING`,
        [req.userId],
      );

      return reply.send(ok({ enrolled: true }));
    } catch (err) {
      fastify.log.error(err, 'Failed to enroll developer');
      return reply.status(500).send(fail({ name: 'Error', code: 'DEV_ENROLL_ERR', message: 'Failed to enroll as developer', statusCode: 500 }));
    }
  });
};
