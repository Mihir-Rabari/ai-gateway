import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

/**
 * Shared Fastify error handler plugin.
 *
 * Registers a standardized `setErrorHandler` that converts any thrown error
 * into a consistent JSON response shape:
 * ```json
 * { "success": false, "error": { "code": "...", "message": "...", "statusCode": ... } }
 * ```
 *
 * Expected error properties (all optional, with sensible defaults):
 *   - `statusCode` — HTTP status code (default: 500)
 *   - `code`       — application error code string (default: `'INTERNAL'`)
 *   - `message`    — human-readable message (default: `'Internal server error'`)
 */
export const errorHandlerPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, req, reply) => {
    const appError = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = appError.statusCode ?? 500;
    req.log.error({ err: error }, 'Unhandled error');

    // Mask messages for 5xx errors to prevent information leakage
    const isServerError = statusCode >= 500;
    const message = isServerError ? 'Internal server error' : (appError.message ?? 'Internal server error');

    reply.status(statusCode).send({
      success: false,
      error: {
        code: appError.code ?? 'INTERNAL',
        message,
        statusCode,
      },
    });
  });
});
