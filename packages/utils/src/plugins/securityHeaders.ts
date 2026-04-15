import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

export const securityHeadersPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook('onSend', async (_req, reply) => {
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // For services rendering HTML (like auth-service login pages), we need 'unsafe-inline' for styles
    reply.header('Content-Security-Policy', "default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;");
    reply.header('X-XSS-Protection', '1; mode=block');
  });
});
