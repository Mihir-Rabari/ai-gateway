import { timingSafeEqual } from 'crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ok, fail, GatewayError } from '@ai-gateway/utils';
import { CodexOAuthService } from '../services/codexOAuthService.js';

export async function codexRoutes(fastify: FastifyInstance) {
  const codexService = new CodexOAuthService(
    fastify.pg,
    fastify.redis,
    fastify.kafka.publish.bind(fastify.kafka),
  );

  // ─── Device-Code Login: Step 1 ────────────────────────────────────
  // POST /auth/codex/device-code
  // Initiates the device-code flow. Returns user_code + verification_uri.
  fastify.post(
    '/auth/codex/device-code',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send(fail(new GatewayError('AUTH_001', 'Missing token', 401)));
        }

        // Validate token first to get userId
        const token = authHeader.slice(7);
        const validateRes = await fetch(
          `${process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3003'}/internal/auth/validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': process.env['INTERNAL_SERVICE_SECRET'] ?? '',
            },
            body: JSON.stringify({ token }),
          },
        );
        const validateBody = await validateRes.json() as {
          success: boolean;
          data?: { userId: string };
        };
        if (!validateRes.ok || !validateBody.success || !validateBody.data) {
          return reply.status(401).send(fail(new GatewayError('AUTH_001', 'Invalid token', 401)));
        }

        const deviceCode = await codexService.requestDeviceCode();

        // Store device_code in Redis linked to userId for the polling step
        await fastify.redis.setex(
          `codex:device:${deviceCode.deviceCode}`,
          600, // 10 min TTL
          validateBody.data.userId,
        );

        // Also store the user_code so pollDeviceCode can send it to OpenAI
        await fastify.redis.setex(
          `codex:device:usercode:${deviceCode.deviceCode}`,
          600,
          deviceCode.userCode,
        );

        return reply.send(ok({
          userCode: deviceCode.userCode,
          verificationUri: deviceCode.verificationUri,
          deviceCode: deviceCode.deviceCode,
          interval: deviceCode.interval,
        }));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 500)
          .send(fail(err as GatewayError));
      }
    },
  );

  // ─── Poll Device-Code: Step 2 ──────────────────────────────────────
  // POST /auth/codex/poll
  // Polls for completion of the device-code flow.
  fastify.post(
    '/auth/codex/poll',
    {
      schema: {
        body: {
          type: 'object',
          required: ['deviceCode'],
          properties: {
            deviceCode: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Body: { deviceCode: string } }>, reply: FastifyReply) => {
      try {
        const { deviceCode } = req.body;

        // Get userId from Redis
        const userId = await fastify.redis.get(`codex:device:${deviceCode}`);
        if (!userId) {
          return reply.status(400).send(fail(
            new GatewayError('CODEX_AUTH_006', 'Device code expired or invalid', 400),
          ));
        }

        // Use default interval from the stored device code info
        const interval = 5;
        const tokens = await codexService.pollDeviceCode(deviceCode, interval);

        // Decode account ID from the ID token
        let accountId: string | undefined;
        if (tokens.idToken) {
          try {
            const payload = JSON.parse(
              Buffer.from(tokens.idToken.split('.')[1]!, 'base64url').toString('utf8'),
            ) as { sub?: string };
            accountId = payload.sub;
          } catch { /* ignore */ }
        }

        // Store tokens
        await codexService.storeSession(userId, tokens.accessToken, tokens.refreshToken, tokens.expiresIn, accountId);

        // Clean up Redis device code
        await fastify.redis.del(`codex:device:${deviceCode}`);
        await fastify.redis.del(`codex:device:usercode:${deviceCode}`);

        return reply.send(ok({ status: 'authenticated', accountId }));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 500)
          .send(fail(err as GatewayError));
      }
    },
  );

  // ─── Check Codex Session Status ───────────────────────────────────
  // GET /auth/codex/session
  fastify.get(
    '/auth/codex/session',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send(fail(new GatewayError('AUTH_001', 'Missing token', 401)));
        }

        const token = authHeader.slice(7);
        const validateRes = await fetch(
          `${process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3003'}/internal/auth/validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': process.env['INTERNAL_SERVICE_SECRET'] ?? '',
            },
            body: JSON.stringify({ token }),
          },
        );
        const validateBody = await validateRes.json() as {
          success: boolean;
          data?: { userId: string };
        };
        if (!validateRes.ok || !validateBody.success || !validateBody.data) {
          return reply.status(401).send(fail(new GatewayError('AUTH_001', 'Invalid token', 401)));
        }

        const sessionInfo = await codexService.getSessionInfo(validateBody.data.userId);
        return reply.send(ok(sessionInfo));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 500)
          .send(fail(err as GatewayError));
      }
    },
  );

  // ─── Disconnect Codex Session ─────────────────────────────────────
  // POST /auth/codex/disconnect
  fastify.post(
    '/auth/codex/disconnect',
    {
      schema: {
        headers: {
          type: 'object',
          required: ['authorization'],
          properties: {
            authorization: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send(fail(new GatewayError('AUTH_001', 'Missing token', 401)));
        }

        const token = authHeader.slice(7);
        const validateRes = await fetch(
          `${process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3003'}/internal/auth/validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': process.env['INTERNAL_SERVICE_SECRET'] ?? '',
            },
            body: JSON.stringify({ token }),
          },
        );
        const validateBody = await validateRes.json() as {
          success: boolean;
          data?: { userId: string };
        };
        if (!validateRes.ok || !validateBody.success || !validateBody.data) {
          return reply.status(401).send(fail(new GatewayError('AUTH_001', 'Invalid token', 401)));
        }

        await codexService.deleteSession(validateBody.data.userId);
        return reply.send(ok({ status: 'disconnected' }));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 500)
          .send(fail(err as GatewayError));
      }
    },
  );

  // ─── Internal: Get user's Codex access token ──────────────────────
  // POST /internal/auth/codex/token
  // Used by routing-service to get the token for proxying
  fastify.post(
    '/internal/auth/codex/token',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
        headers: {
          type: 'object',
          required: ['x-internal-secret'],
          properties: {
            'x-internal-secret': { type: 'string' },
          },
        },
      },
    },
    async (
      req: FastifyRequest<{ Body: { userId: string } }>,
      reply: FastifyReply,
    ) => {
      // Internal secret check
      const internalSecret = process.env['INTERNAL_SERVICE_SECRET'] || '';
      const headerVal = req.headers['x-internal-secret'];
      const clientSecret = Array.isArray(headerVal) ? headerVal[0] : (headerVal || '');

      const internalSecretBuf = Buffer.from(internalSecret, 'utf8');
      const clientSecretBuf = Buffer.from(clientSecret, 'utf8');

      if (
        internalSecretBuf.length === 0 ||
        clientSecretBuf.length !== internalSecretBuf.length ||
        !timingSafeEqual(clientSecretBuf, internalSecretBuf)
      ) {
        return reply.status(403).send(fail(new GatewayError('FORBIDDEN', 'Invalid internal secret', 403)));
      }

      try {
        const accessToken = await codexService.getValidAccessToken(req.body.userId);
        return reply.send(ok({ accessToken }));
      } catch (err) {
        return reply
          .status((err as GatewayError).statusCode ?? 500)
          .send(fail(err as GatewayError));
      }
    },
  );
}
