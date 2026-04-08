import type { FastifyInstance } from 'fastify';
import { OAuthController } from '../controllers/oauthController.js';

export async function oauthRoutes(fastify: FastifyInstance) {
  const controller = new OAuthController(fastify.pg, fastify.redis);

  // GET /oauth/authorize — show the login/consent page
  fastify.get(
    '/authorize',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        querystring: {
          type: 'object',
          properties: {
            client_id: { type: 'string' },
            redirect_uri: { type: 'string' },
            response_type: { type: 'string' },
            scope: { type: 'string' },
            state: { type: 'string' },
          },
        },
      },
    },
    controller.authorize.bind(controller),
  );

  // POST /oauth/authorize/submit — process the login form
  fastify.post(
    '/authorize/submit',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          properties: {
            client_id: { type: 'string' },
            redirect_uri: { type: 'string' },
            scope: { type: 'string' },
            state: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
    controller.authorizeSubmit.bind(controller),
  );

  // POST /oauth/token — exchange auth code for tokens
  fastify.post(
    '/token',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          properties: {
            client_id: { type: 'string' },
            client_secret: { type: 'string' },
            code: { type: 'string' },
            redirect_uri: { type: 'string' },
            grant_type: { type: 'string' },
          },
        },
      },
    },
    controller.token.bind(controller),
  );
}
