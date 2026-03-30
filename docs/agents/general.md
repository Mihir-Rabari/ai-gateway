# General Agent Instructions
> **Read this BEFORE starting any task. This applies to ALL agents.**

---

## 📌 Identity & Context

You are working inside the **AI Gateway** monorepo at `k:\projects\AI GATEWAY\gateway`.

This is a TypeScript monorepo using:
- **pnpm workspaces** + **Turborepo**
- **Node.js** backend services (Fastify framework)
- **Next.js 15** frontend (App Router, Tailwind CSS v4, shadcn/ui)
- **PostgreSQL** (primary DB), **Redis** (cache), **Kafka** (events), **ClickHouse** (analytics)

Read `plans.md` at the root for the full architecture picture before doing anything.
Read `tasks.md` at the root to understand what all 10 agents are working on.

---

## 📁 Where Things Live

```
gateway/
├── apps/
│   ├── web/               ← Next.js frontend (Agent 9 owns)
│   ├── api/               ← Public API aggregation (Agent 8 owns)
│   ├── auth-service/      ← JWT auth (Agent 2 owns)
│   ├── gateway/           ← AI request engine (Agent 4 owns)
│   ├── credit-service/    ← Credit wallet (Agent 3 owns)
│   ├── billing-service/   ← Razorpay (Agent 6 owns)
│   ├── routing-service/   ← Model routing (Agent 5 owns)
│   ├── analytics-service/ ← ClickHouse (Agent 7 owns)
│   └── worker/            ← Kafka consumers (Agent 7 owns)
├── packages/
│   ├── types/             ← Shared TypeScript types — READ ONLY for most agents
│   ├── utils/             ← Logger, errors, helpers — READ ONLY for most agents
│   ├── config/            ← Env config — READ ONLY for most agents
│   ├── ui/                ← Shared React components
│   └── sdk-js/            ← JavaScript SDK (Agent 10 owns)
├── infra/                 ← Docker, DB schemas (Agent 1 owns)
├── plans.md               ← Master architecture document
└── tasks.md               ← All agent tasks
```

---

## 🛑 Conflict Avoidance Rules

1. **Never modify a file owned by another agent.** If you need a cross-service change, create a note in your task doc.
2. **Shared packages (`packages/types`, `packages/utils`, `packages/config`)** — only modify if absolutely necessary and document what you changed.
3. **Never modify `pnpm-workspace.yaml`, `turbo.json`, or `tsconfig.base.json`** without flagging it.
4. **Database schema** is owned by Agent 1. If you need a new table/column, document the requirement in your task doc.
5. **Environment variables** — if you add a new env var, add it to `.env.example` AND `packages/config/src/index.ts`.

---

## 🔧 TypeScript Rules

- **Always use TypeScript** — never write `.js` files (except config files)
- Module resolution: `NodeNext` — always use `.js` extensions in imports
  ```typescript
  import { foo } from './bar.js'; // ✅ correct
  import { foo } from './bar';    // ❌ wrong
  ```
- Use `type` for imports when importing only types:
  ```typescript
  import type { User } from '@ai-gateway/types';
  ```
- Never use `any` — use `unknown` and narrow properly
- Run `pnpm --filter <your-service> exec tsc --noEmit` to check before committing

---

## 🧱 Architecture Patterns

### Service Pattern
```
apps/<service>/src/
├── index.ts          ← Bootstrap: register plugins, routes, start server
├── plugins/
│   ├── postgres.ts   ← DB connection decorated on fastify
│   ├── redis.ts      ← Redis connection
│   └── kafka.ts      ← Kafka producer (if needed)
├── routes/
│   └── <domain>Routes.ts   ← Route definitions (schema validation, call controller)
├── services/
│   └── <Domain>Service.ts  ← Business logic (no HTTP concerns)
├── repositories/
│   └── <Domain>Repository.ts ← All SQL queries (no logic)
└── events/
    └── <domain>Events.ts   ← Kafka event helpers
```

### Error Handling
Always use `GatewayError` from `@ai-gateway/utils`:
```typescript
import { Errors, fail, type GatewayError } from '@ai-gateway/utils';

// In routes:
} catch (err) {
  return reply
    .status((err as GatewayError).statusCode ?? 500)
    .send(fail(err as GatewayError));
}

// Throwing errors:
throw Errors.INVALID_TOKEN();
throw Errors.INSUFFICIENT_CREDITS(balance, required);
throw Errors.NOT_FOUND('User');
```

### API Response Shape
All endpoints return:
```typescript
// Success:
{ success: true, data: T }

// Error:
{ success: false, error: { code: string, message: string, statusCode: number } }
```

Use `ok(data)` and `fail(error)` from `@ai-gateway/utils`.

---

## 📦 Shared Package Usage

### `@ai-gateway/config`
```typescript
import { getAuthConfig } from '@ai-gateway/config';
const config = getAuthConfig();
config.JWT_ACCESS_SECRET; // type-safe env var
```

### `@ai-gateway/utils`
```typescript
import { createLogger, Errors, ok, fail, generateId, calculateCredits } from '@ai-gateway/utils';
const logger = createLogger('my-service');
```

### `@ai-gateway/types`
```typescript
import type { User, UsageEvent, GatewayRequest } from '@ai-gateway/types';
```

---

## 🏃 Running Your Service

```bash
# Install all deps (from root)
pnpm install

# Build shared packages first (required before running services)
pnpm --filter @ai-gateway/types build
pnpm --filter @ai-gateway/utils build
pnpm --filter @ai-gateway/config build

# Type-check your service
pnpm --filter @ai-gateway/<your-service> exec tsc --noEmit

# Run your service in dev mode
pnpm --filter @ai-gateway/<your-service> dev

# Run all services together
pnpm turbo dev
```

---

## 🌍 Service Port Map

| Service | Port |
|---------|------|
| Frontend (web) | 3000 |
| API (aggregation) | 3001 |
| Gateway | 3002 |
| Auth Service | 3003 |
| Billing Service | 3004 |
| Credit Service | 3005 |
| Routing Service | 3006 |
| Analytics | 3007 |
| Worker | 3008 |

---

## ✅ Before Submitting Your Work

- [ ] TypeScript compiles: `pnpm --filter @ai-gateway/<service> exec tsc --noEmit`
- [ ] No `console.log` — use `logger.info()`, `logger.error()`, etc.
- [ ] All new env vars added to `.env.example`
- [ ] No hardcoded secrets or URLs
- [ ] All routes have JSON schema validation
- [ ] Error responses use the standard `{ success: false, error: {...} }` shape
- [ ] At least one test written for the main happy path
