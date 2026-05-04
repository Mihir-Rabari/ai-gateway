import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Shared Fastify security headers plugin.
 *
 * Adds standard security headers to all responses using the `onSend` hook
 * to ensure a minimal dependency footprint without relying on external packages like `@fastify/helmet`.
 */
export const securityHeadersPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onSend', async (req: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    // Fastify natively generates a req.id for every request
    const reqId = req.id;

    reply.header('X-Request-Id', reqId);
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Allow inline scripts and styles for Swagger UI
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");

    reply.header('X-XSS-Protection', '0');

    return payload;
  });
});
