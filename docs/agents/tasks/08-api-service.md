# Agent 8 — API Aggregation Layer

**Owner:** Agent 8
**Scope:** `apps/api/`
**Must NOT touch:** Other services directly (only communicate via HTTP)

---

## Your Mission

Build the single public-facing API that all SDK users and frontend apps talk to. You are the front door. Every external request hits you first. You handle CORS, rate limiting, auth middleware, and proxy requests to internal services. Developers must love working with your API.

---

## Current State

- ❌ Only has a placeholder `src/index.ts`
- Nothing is implemented yet

---

## Service Architecture

```
apps/api/src/
├── index.ts               ← Bootstrap + register all plugins + routes
├── plugins/
│   ├── cors.ts            ← CORS configuration
│   ├── rateLimit.ts       ← Per-IP rate limiting
│   ├── swagger.ts         ← Auto-generate OpenAPI docs
│   └── auth.ts            ← JWT validation middleware
├── routes/
│   ├── v1/
│   │   ├── chat.ts        ← POST /api/v1/chat
│   │   ├── me.ts          ← GET /api/v1/me
│   │   ├── credits.ts     ← GET /api/v1/credits, GET /api/v1/credits/transactions
│   │   ├── usage.ts       ← GET /api/v1/usage
│   │   ├── models.ts      ← GET /api/v1/models
│   │   ├── apps.ts        ← CRUD for developer apps
│   │   ├── keys.ts        ← API key management
│   │   └── billing.ts     ← GET /api/v1/billing/plans, POST /api/v1/billing/subscribe
│   └── health.ts          ← GET /api/health
└── middleware/
    └── requireAuth.ts     ← FastifyPreHandler hook to validate JWT
```

---

## Tasks

### Task 1 — Bootstrap (index.ts)

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { createLogger } from '@ai-gateway/utils';

const logger = createLogger('api');
const app = Fastify({ logger: false, genReqId: () => `req_${Date.now()}` });

async function bootstrap() {
  // CORS
  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
    timeWindow: Number(process.env['RATE_LIMIT_WINDOW_MS'] ?? 60000),
  });

  // Swagger
  await app.register(swagger, {
    openapi: {
      info: { title: 'AI Gateway API', version: '1.0.0', description: 'Public API for AI Gateway' },
      servers: [{ url: process.env['API_URL'] ?? 'http://localhost:3001' }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  // Routes
  await app.register(import('./routes/health.js').then(m => m.healthRoute));
  await app.register(import('./routes/v1/me.js').then(m => m.meRoutes), { prefix: '/api/v1' });
  await app.register(import('./routes/v1/chat.js').then(m => m.chatRoutes), { prefix: '/api/v1' });
  await app.register(import('./routes/v1/credits.js').then(m => m.creditRoutes), { prefix: '/api/v1' });
  await app.register(import('./routes/v1/usage.js').then(m => m.usageRoutes), { prefix: '/api/v1' });
  await app.register(import('./routes/v1/models.js').then(m => m.modelRoutes), { prefix: '/api/v1' });
  await app.register(import('./routes/v1/apps.js').then(m => m.appRoutes), { prefix: '/api/v1' });
  await app.register(import('./routes/v1/billing.js').then(m => m.billingRoutes), { prefix: '/api/v1' });

  await app.listen({ port: Number(process.env['API_PORT'] ?? 3001), host: '0.0.0.0' });
  logger.info('🚀 API service running on port 3001');
}

bootstrap().catch((err) => { logger.error(err, 'API start failed'); process.exit(1); });
```

### Task 2 — Auth Middleware

Create `apps/api/src/middleware/requireAuth.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';

// Store validated user on request context
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    planId: 'free' | 'pro' | 'max';
    userEmail: string;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: { code: 'AUTH_001', message: 'Missing token', statusCode: 401 } });
  }
  
  const token = authHeader.slice(7);
  const res = await fetch(`${process.env['AUTH_SERVICE_URL']}/internal/auth/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  
  const json = await res.json() as { success: boolean; data?: { userId: string; planId: string; email: string } };
  if (!json.success || !json.data) {
    return reply.status(401).send({ success: false, error: { code: 'AUTH_002', message: 'Invalid token', statusCode: 401 } });
  }
  
  req.userId = json.data.userId;
  req.planId = json.data.planId as 'free' | 'pro' | 'max';
  req.userEmail = json.data.email;
}
```

### Task 3 — Chat Route (POST /api/v1/chat)

```typescript
// Proxy to gateway-service
fastify.post('/chat', {
  preHandler: [requireAuth],
  schema: {
    body: {
      type: 'object',
      required: ['model', 'messages'],
      properties: {
        model: { type: 'string' },
        messages: { type: 'array' },
        maxTokens: { type: 'number' },
        appId: { type: 'string' },
      },
    },
  },
}, async (req, reply) => {
  // Forward to gateway with user's token
  const authHeader = req.headers['authorization'] as string;
  const res = await fetch(`${process.env['GATEWAY_URL']}/gateway/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      'X-App-Id': (req.body as any).appId ?? 'api-direct',
    },
    body: JSON.stringify(req.body),
  });
  const data = await res.json();
  return reply.status(res.status).send(data);
});
```

### Task 4 — Developer App Registration Routes

```typescript
// POST /api/v1/apps — register new app
// Inserts into `registered_apps` table directly (API layer has its own DB pool)
// Returns: { appId, name, apiKey }

// GET /api/v1/apps — list developer's apps
// Queries `registered_apps WHERE developer_id = req.userId`

// DELETE /api/v1/apps/:id — soft delete app

// POST /api/v1/apps/:id/keys — rotate API key
// Generates new key, stores hash in `api_keys` table
```

### Task 5 — OpenAPI Documentation

Every route must have a complete `schema` with:
- `tags` — for grouping in Swagger UI
- `description` — what the endpoint does
- `security` — mark protected routes with `[{ bearerAuth: [] }]`
- Request body schema
- Response schemas

### Task 6 — Required Dependencies

```bash
pnpm --filter @ai-gateway/api add fastify @fastify/cors @fastify/rate-limit @fastify/swagger @fastify/swagger-ui pg ioredis
pnpm --filter @ai-gateway/api add -D @types/node typescript
```

---

## Database Tables You Access

```sql
-- registered_apps
CREATE TABLE registered_apps (
  id UUID PRIMARY KEY,
  developer_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- api_keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  app_id UUID NOT NULL REFERENCES registered_apps(id),
  key_hash VARCHAR(255) NOT NULL UNIQUE,  -- bcrypt/sha256 hash
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

If these tables don't exist in the schema yet, document them for Agent 1.

---

## Env Vars

```env
API_PORT=3001
DATABASE_URL=
REDIS_URL=
AUTH_SERVICE_URL=http://localhost:3003
GATEWAY_URL=http://localhost:3002
CREDIT_SERVICE_URL=http://localhost:3005
ANALYTICS_SERVICE_URL=http://localhost:3007
BILLING_SERVICE_URL=http://localhost:3004
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Important Notes

- The API service is the ONLY publicly exposed service
- All other services (`auth-service`, `gateway`, etc.) should not be directly accessible in production
- The API service proxies requests — it does NOT duplicate business logic
- All protected routes must use the `requireAuth` preHandler
