# Backend Guidelines

## Framework
- **Framework**: Fastify (not Express)
- Use Fastify plugins for shared concerns (auth, rate limiting, db)
- Register all plugins in `src/plugins/` before routes

## Folder Structure (per service)
```
src/
 ├── index.ts            # Server bootstrap
 ├── routes/             # Route definitions (thin — just wire path to controller)
 ├── controllers/        # Request/response handling only
 ├── services/           # Business logic
 ├── repositories/       # Database queries
 ├── models/             # TypeScript interfaces & DB model types
 ├── events/             # Kafka event publishing
 ├── plugins/            # Fastify plugins (postgres, redis, kafka)
 └── types/              # Local TS types
```

## Request Flow
```
Request → Route → Controller → Service → Repository
                     ↓
                  Events (Kafka)
```

## Rules
1. **Routes** — only define path + method, attach controller, add schema validation
2. **Controllers** — extract params, call service, return formatted response
3. **Services** — all business logic lives here, call repositories, publish events
4. **Repositories** — raw DB queries only, no business logic
5. **Never** call external AI providers directly from a controller or service
6. **Never** make DB calls directly in routes or controllers

## Validation
- Always validate request body/params using Fastify JSON schema
- Validate user token on every protected route
- Validate credit balance before processing any AI request

## Async Events
- Use Kafka for async operations (usage tracking, billing, analytics)
- Never wait for Kafka publish before returning HTTP response (fire-and-forget)
- Use typed event interfaces from `@ai-gateway/types`

## Database
- PostgreSQL for all transactional data
- Use parameterized queries — never string-interpolate SQL
- Wrap multi-step operations in transactions

## Caching
- Redis for sessions, rate limit counters, credit locks
- Always set TTL on Redis keys
- Use Redis atomic operations (`SETNX`, `INCRBY`) for credit locking

## Error Codes
```
AUTH_001 — Invalid token
AUTH_002 — Token expired
AUTH_003 — Insufficient permissions
CREDIT_001 — Insufficient credits
CREDIT_002 — Credit lock failed
GATEWAY_001 — Model provider error
GATEWAY_002 — Routing failed
```
