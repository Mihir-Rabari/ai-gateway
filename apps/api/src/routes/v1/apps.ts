import type { FastifyPluginAsync } from 'fastify';
import pg from 'pg';
import { requireAuth } from '../../middleware/requireAuth.js';
import { ok, fail } from '@ai-gateway/utils';
import { AppRepository } from '../../repositories/AppRepository.js';
import { AppService } from '../../services/AppService.js';

const pool = new pg.Pool({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://gateway_user:gateway_pass@localhost:5432/ai_gateway',
});
const appRepository = new AppRepository(pool);
const appService = new AppService(appRepository);

export const appRoutes: FastifyPluginAsync = async (fastify) => {
  const analyticsServiceUrl = process.env['ANALYTICS_SERVICE_URL'] ?? 'http://localhost:3007';

  fastify.post('/apps', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Developer Apps'],
      description: 'Register a new developer app',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          redirectUris: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            default: [],
          },
        },
      },
    },
  }, async (req, reply) => {
    const { name, description, redirectUris } = req.body as { name: string; description?: string; redirectUris?: string[] };

    try {
      const appData = await appService.registerApp(req.userId, name, description, redirectUris ?? []);
      return reply.send(ok(appData));
    } catch (err) {
      fastify.log.error(err, 'Failed to create app');
      return reply.status(500).send(fail({ name: 'Error', code: 'APP_CREATE_ERR', message: 'Failed to create app', statusCode: 500 }));
    }
  });

  fastify.get('/apps', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Developer Apps'],
      description: 'List user\'s registered apps',
      security: [{ bearerAuth: [] }],
    },
  }, async (req, reply) => {
    try {
      const apps = await appService.listApps(req.userId);
      return reply.send(ok(apps));
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch apps');
      return reply.status(500).send(fail({ name: 'Error', code: 'APP_FETCH_ERR', message: 'Failed to fetch apps', statusCode: 500 }));
    }
  });

  fastify.delete('/apps/:id', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Developer Apps'],
      description: 'Delete a registered app',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const success = await appService.deleteApp(id, req.userId);
      if (!success) {
        return reply.status(404).send(fail({ name: 'NotFoundError', code: 'APP_NOT_FOUND', message: 'App not found', statusCode: 404 }));
      }
      return reply.send(ok({ success: true }));
    } catch (err) {
      fastify.log.error(err, 'Failed to delete app');
      return reply.status(500).send(fail({ name: 'Error', code: 'APP_DELETE_ERR', message: 'Failed to delete app', statusCode: 500 }));
    }
  });

  fastify.post('/apps/:id/keys', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Developer Apps'],
      description: 'Generate a new API key for an app',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const result = await appService.rotateApiKey(id, req.userId);

      if (!result) {
        return reply.status(404).send(fail({ name: 'NotFoundError', code: 'APP_NOT_FOUND', message: 'App not found', statusCode: 404 }));
      }

      return reply.send(ok({ apiKey: result.apiKey }));
    } catch (err) {
      fastify.log.error(err, 'Failed to rotate API key');
      return reply.status(500).send(fail({ name: 'Error', code: 'APP_ROTATE_KEY_ERR', message: 'Failed to rotate API key', statusCode: 500 }));
    }
  });

  fastify.put('/apps/:id/redirect-uris', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Developer Apps'],
      description: 'Update the list of allowed OAuth redirect URIs for an app',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['redirectUris'],
        properties: {
          redirectUris: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { redirectUris } = req.body as { redirectUris: string[] };

    try {
      const success = await appService.updateRedirectUris(id, req.userId, redirectUris);
      if (!success) {
        return reply.status(404).send(fail({ name: 'NotFoundError', code: 'APP_NOT_FOUND', message: 'App not found', statusCode: 404 }));
      }
      return reply.send(ok({ redirectUris }));
    } catch (err) {
      fastify.log.error(err, 'Failed to update redirect URIs');
      return reply.status(500).send(fail({ name: 'Error', code: 'APP_UPDATE_REDIRECT_ERR', message: 'Failed to update redirect URIs', statusCode: 500 }));
    }
  });

  fastify.get('/apps/:id/usage', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Developer Apps'],
      description: 'Get usage analytics for a specific app',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const apps = await appService.listApps(req.userId);
      const exists = (apps as Array<{ id: string }>).some((app) => app.id === id);

      if (!exists) {
        return reply.status(404).send(fail({ name: 'NotFoundError', code: 'APP_NOT_FOUND', message: 'App not found', statusCode: 404 }));
      }

      const analyticsRes = await fetch(`${analyticsServiceUrl}/analytics/usage/app?appId=${encodeURIComponent(id)}`);
      const analyticsData = await analyticsRes.json();
      return reply.status(analyticsRes.status).send(analyticsData);
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch app usage');
      return reply.status(500).send(fail({ name: 'Error', code: 'APP_USAGE_FETCH_ERR', message: 'Failed to fetch app usage', statusCode: 500 }));
    }
  });
};
