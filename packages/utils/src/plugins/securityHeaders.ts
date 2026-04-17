import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

/**
 * Shared Fastify plugin to add standard security headers to all responses.
 *
 * Adds:
 * - X-Request-Id: Correlation ID for the request
 * - X-Frame-Options: Prevents clickjacking (DENY)
 * - X-Content-Type-Options: Prevents MIME type sniffing (nosniff)
 * - Strict-Transport-Security: Forces HTTPS (1 year)
 * - Content-Security-Policy: Restricts resource loading (default-src 'none')
 * - X-XSS-Protection: Enables browser XSS filtering (1; mode=block)
 */
export const securityHeadersPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onSend', async (req, reply) => {
    reply.header('X-Request-Id', req.id);
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('Content-Security-Policy', "default-src 'none'");
    reply.header('X-XSS-Protection', '1; mode=block');
  });
});
