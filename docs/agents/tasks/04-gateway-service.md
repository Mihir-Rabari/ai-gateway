# Agent 4 — Gateway Service (AI Request Engine)

**Owner:** Agent 4
**Scope:** `apps/gateway/`
**Must NOT touch:** Other services, `infra/`, shared packages (read only)

---

## Your Mission

Build the core AI request pipeline. A user sends a chat message, you validate them, protect their credits, route to the right model, and return a response — all within 30 seconds. Every millisecond matters.

---

## Current State

- ✅ POST /gateway/request implemented
- ✅ Token validation via auth-service
- ✅ Credit lock → confirm → release
- ✅ Kafka usage event publishing
- ❌ App API key validation missing
- ❌ No timeout handling
- ❌ No streaming support
- ❌ Gateway service needs full plugin setup (postgres, redis)
- ❌ No rate limiting

---

## Service Architecture

```
apps/gateway/src/
├── index.ts
├── plugins/
│   ├── postgres.ts    ← CREATE: for app key validation
│   ├── redis.ts       ← CREATE: for rate limiting
│   └── kafka.ts       ← Already exists
├── routes/
│   └── gatewayRoutes.ts
├── services/
│   └── gatewayService.ts
└── middleware/
    └── authMiddleware.ts   ← CREATE: JWT validation middleware
```

---

## Tasks

### Task 1 — Create Gateway Plugins

Create `apps/gateway/src/plugins/postgres.ts` (same pattern as auth-service):
```typescript
import fp from 'fastify-plugin';
import { Pool } from 'pg';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance { pg: Pool; }
}

export const postgresPlugin = fp(async (fastify: FastifyInstance) => {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'], max: 10 });
  const client = await pool.connect();
  client.release();
  fastify.decorate('pg', pool);
  fastify.addHook('onClose', async () => { await pool.end(); });
});
```

Create `apps/gateway/src/plugins/redis.ts` similarly.

### Task 2 — App API Key Validation

When a request comes in with `X-App-Id` header, validate this against `registered_apps` table:

```typescript
// apps/gateway/src/middleware/appKeyMiddleware.ts
async function validateAppKey(fastify: FastifyInstance, appId: string): Promise<boolean> {
  const result = await fastify.pg.query(
    'SELECT id FROM registered_apps WHERE id = $1 AND is_active = true',
    [appId]
  );
  return (result.rowCount ?? 0) > 0;
}
```

### Task 3 — Request Timeout

Wrap the routing call with a timeout:
```typescript
const TIMEOUT_MS = 30_000;

const routingPromise = this.routeRequest(data);
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('Request timeout')), TIMEOUT_MS)
);

try {
  routingResult = await Promise.race([routingPromise, timeoutPromise]);
} catch (err) {
  await this.releaseCredits(user.userId, requestId);
  throw err instanceof Error && err.message === 'Request timeout'
    ? new GatewayError('GATEWAY_003', 'Request timed out', 504)
    : err;
}
```

### Task 4 — Rate Limiting

Install `@fastify/rate-limit`. Apply per-user rate limit:
- Free plan: 10 requests/minute
- Pro plan: 60 requests/minute
- Max plan: 200 requests/minute

The plan comes from the validated token payload (add `planId` to validation response).

### Task 5 — GET /gateway/status

```typescript
fastify.get('/status', async (_req, reply) => {
  return reply.send(ok({
    status: 'healthy',
    providers: ['openai', 'anthropic', 'google'],
    timestamp: new Date().toISOString(),
  }));
});
```

### Task 6 — Request ID in Response Headers

Add `X-Request-Id` header to every response:
```typescript
fastify.addHook('onSend', async (req, reply) => {
  reply.header('X-Request-Id', req.id);
});
```

### Task 7 — Unit Tests

```typescript
describe('GatewayService', () => {
  // Mock: auth-service call (returns valid user)
  // Mock: credit-service lock/confirm/release
  // Mock: routing-service call (returns output)
  // Test: full end-to-end request flow
  // Test: credit is released when routing fails
  // Test: timeout releases credits
});
```

---

## Request Flow (Full)

```
POST /gateway/request
  Headers: Authorization: Bearer <access-token>
           X-App-Id: <app-id>
  Body: { model, messages, maxTokens? }

1. Validate JWT via auth-service (POST /internal/auth/validate)
   → returns { userId, planId, email }

2. [Optional] Validate App ID via Postgres query

3. Check rate limit (Redis counter per userId per minute)

4. Estimate credits needed (calculateCredits(model, maxTokens))

5. Lock credits (POST credit-service /credits/lock)
   → fails with 402 if insufficient, 503 if lock race

6. Route request (POST routing-service /internal/routing/route)
   → returns { output, tokensInput, tokensOutput, tokensTotal, model, provider }
   → on failure: release credits, publish failed event, return 502

7. Calculate actual credits used (calculateCredits(model, tokensTotal))

8. Confirm credit deduction (POST credit-service /credits/confirm)

9. Publish usage event to Kafka

10. Return response:
    { requestId, output, tokensInput, tokensOutput, tokensTotal,
      creditsDeducted, model, provider, latencyMs }
```

---

## Env Vars

```env
DATABASE_URL=
REDIS_URL=
KAFKA_BROKERS=
GATEWAY_PORT=3002
AUTH_SERVICE_URL=http://localhost:3003
CREDIT_SERVICE_URL=http://localhost:3005
ROUTING_SERVICE_URL=http://localhost:3006
```
