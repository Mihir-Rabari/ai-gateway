import type { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/authController.js';

const signupSchema = {
  body: {
    type: 'object',
    required: ['email', 'name', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      name: { type: 'string', minLength: 2 },
      password: { type: 'string', minLength: 8 },
    },
  },
};

const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },
};

const refreshSchema = {
  body: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string' },
    },
  },
};

export async function authRoutes(fastify: FastifyInstance) {
  const controller = new AuthController(fastify.pg, fastify.redis);

  // POST /auth/signup
  fastify.post('/signup', { schema: signupSchema }, controller.signup.bind(controller));

  // POST /auth/login
  fastify.post('/login', {
    schema: loginSchema,
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
      },
    },
  }, controller.login.bind(controller));

  // POST /auth/refresh
  fastify.post('/refresh', { schema: refreshSchema }, controller.refresh.bind(controller));

  // POST /auth/logout
  fastify.post('/logout', controller.logout.bind(controller));

  // GET /auth/me
  fastify.get('/me', controller.me.bind(controller));
}
