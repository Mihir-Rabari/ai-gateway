# Agent 2 — Auth Service

**Owner:** Agent 2
**Scope:** `apps/auth-service/`
**Must NOT touch:** Other services, shared packages (read only), database schema

---

## Your Mission

Build a bulletproof authentication service. Every user request through the AI Gateway starts with token validation. Auth must be fast, secure, and correct. Users trust us with their accounts — don't break that trust.

---

## Current State

The auth service is implemented but **not fully wired**:
- ✅ Core JWT logic in `authService.ts`
- ✅ Signup, login, refresh, logout routes
- ✅ Internal `/internal/auth/validate` endpoint
- ❌ `UserRepository` is not implemented (DB queries are inline — move to repo)
- ❌ No rate limiting on login
- ❌ No GET /auth/me endpoint
- ❌ No unit tests

---

## Service Architecture

```
apps/auth-service/src/
├── index.ts                 ← Server bootstrap
├── plugins/
│   ├── postgres.ts          ← Pool decorated as fastify.pg
│   ├── redis.ts             ← Redis decorated as fastify.redis
│   └── kafka.ts             ← Producer decorated as fastify.kafka
├── routes/
│   ├── authRoutes.ts        ← Public routes (/auth/*)
│   └── internalRoutes.ts   ← Internal routes (/internal/auth/*)
├── controllers/
│   └── authController.ts   ← Thin layer — delegates to service
├── services/
│   └── authService.ts      ← All business logic
├── repositories/
│   └── userRepository.ts   ← All SQL queries (CREATE THIS)
└── events/
    └── authEvents.ts        ← Kafka event publishing helpers
```

---

## Tasks

### Task 1 — Create UserRepository

Create `apps/auth-service/src/repositories/userRepository.ts`:

```typescript
import type { Pool } from 'pg';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  planId: 'free' | 'pro' | 'max';
  creditBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  constructor(private readonly db: Pool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(
      'SELECT id, email, name, password_hash as "passwordHash", plan_id as "planId", credit_balance as "creditBalance" FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(
      'SELECT id, email, name, password_hash as "passwordHash", plan_id as "planId", credit_balance as "creditBalance" FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async create(data: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    planId: string;
    creditBalance: number;
  }): Promise<UserRecord> {
    const result = await this.db.query<UserRecord>(
      `INSERT INTO users (id, email, name, password_hash, plan_id, credit_balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, password_hash as "passwordHash", plan_id as "planId", credit_balance as "creditBalance"`,
      [data.id, data.email.toLowerCase(), data.name, data.passwordHash, data.planId, data.creditBalance]
    );
    return result.rows[0]!;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists',
      [email.toLowerCase()]
    );
    return result.rows[0]?.exists ?? false;
  }
}
```

### Task 2 — Add GET /auth/me Route

Add to `authRoutes.ts`:
```typescript
// GET /auth/me — returns current authenticated user
fastify.get('/me', async (req, reply) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) throw Errors.INVALID_TOKEN();
    const token = authHeader.slice(7);
    const payload = await authService.validateToken(token);
    const user = await userRepo.findById(payload.userId);
    if (!user) throw Errors.USER_NOT_FOUND();
    return reply.send(ok({
      id: user.id,
      email: user.email,
      name: user.name,
      planId: user.planId,
      creditBalance: user.creditBalance,
    }));
  } catch (err) {
    return reply.status((err as GatewayError).statusCode ?? 401).send(fail(err as GatewayError));
  }
});
```

### Task 3 — Rate Limiting on Login

Install: `pnpm --filter @ai-gateway/auth-service add @fastify/rate-limit`

In `index.ts`, register rate limit plugin:
```typescript
await app.register(import('@fastify/rate-limit'), {
  global: false, // only apply where explicitly declared
  redis: app.redis,
});
```

In `authRoutes.ts`, add to the login route config:
```typescript
{
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute',
      keyGenerator: (req) => req.ip,
    },
  },
  schema: { body: loginSchema },
}
```

### Task 4 — Email Normalization

In `authService.ts`, normalize emails on signup and login:
```typescript
const normalizedEmail = data.email.toLowerCase().trim();
```

### Task 5 — Password Validation

On signup, validate password strength:
```typescript
if (data.password.length < 8) throw Errors.VALIDATION('Password must be at least 8 characters');
if (data.password.length > 128) throw Errors.VALIDATION('Password too long');
```

### Task 6 — Unit Tests

Create `apps/auth-service/src/__tests__/authService.test.ts`:

```typescript
import { AuthService } from '../services/authService.js';
// Mock pg Pool, Redis, and jwt
// Test:
// - signup creates user and returns tokens
// - login with wrong password throws INVALID_CREDENTIALS
// - refresh with expired token throws TOKEN_EXPIRED
// - validateToken with blacklisted token throws INVALID_TOKEN
```

Use `vitest` (add to devDependencies):
```bash
pnpm --filter @ai-gateway/auth-service add -D vitest
```

---

## Schema Reference

The `users` table (defined in `infra/db/postgres-schema.sql`):
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
  credit_balance INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Env Vars You Use

```env
JWT_ACCESS_SECRET=        # Required — 32+ char secret
JWT_REFRESH_SECRET=       # Required — 32+ char secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL=             # Postgres connection
REDIS_URL=                # Redis connection
KAFKA_BROKERS=            # Kafka broker address
AUTH_SERVICE_PORT=3003
```

---

## Do NOT Touch

- `infra/db/postgres-schema.sql` — owned by Agent 1
- `packages/types/` — only read from it
- `packages/config/` — only read from it
- Any other service's code
