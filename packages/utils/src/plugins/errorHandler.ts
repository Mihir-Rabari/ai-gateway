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
  fastify.setErrorHandler((error, _req, reply) => {
    const appError = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = appError.statusCode ?? 500;
    fastify.log.error({ err: error }, 'Unhandled error');

    // Security: Never leak potentially sensitive error details on 5xx responses.
    const isServerError = statusCode >= 500;
    const safeMessage = isServerError ? 'Internal server error' : (appError.message ?? 'Internal server error');

    reply.status(statusCode).send({
      success: false,
      error: {
        code: appError.code ?? 'INTERNAL',
        message: safeMessage,
        statusCode,
      },
    });
  });
});
