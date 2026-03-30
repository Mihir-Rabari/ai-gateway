# Naming Conventions

## Files & Directories
| Item | Convention | Example |
|------|-----------|---------|
| Services | `camelCase` + `Service` suffix | `userService.ts` |
| Controllers | `camelCase` + `Controller` suffix | `authController.ts` |
| Routes | `camelCase` + `Routes` suffix | `userRoutes.ts` |
| Repositories | `camelCase` + `Repository` suffix | `userRepository.ts` |
| Models | `camelCase` | `user.ts` |
| Plugins | `camelCase` | `postgres.ts`, `redis.ts` |
| Events | `camelCase` + `Events` suffix | `authEvents.ts` |
| Types | `camelCase` | `index.ts` |

## Variables & Functions
| Item | Convention | Example |
|------|-----------|---------|
| Variables | `camelCase` | `creditBalance`, `userId` |
| Functions | `camelCase` verb-first | `getUserById`, `deductCredits` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT`, `JWT_EXPIRES_IN` |
| Interfaces | `PascalCase` | `User`, `GatewayRequest` |
| Types | `PascalCase` | `CreditEvent`, `PlanType` |
| Enums | `PascalCase` | `PlanType`, `EventType` |
| Enum values | `UPPER_SNAKE_CASE` | `PlanType.FREE`, `PlanType.PRO` |

## Kafka Events (Topics & Event Types)
| Topic | Event Types |
|-------|------------|
| `auth.events` | `user.created`, `user.login`, `user.logout` |
| `credit.events` | `credit.deducted`, `credit.added`, `credit.locked`, `credit.released` |
| `billing.events` | `billing.subscription.created`, `billing.subscription.renewed`, `billing.subscription.cancelled` |
| `usage.events` | `usage.request.completed`, `usage.request.failed` |
| `routing.events` | `routing.selected`, `routing.fallback` |
| `analytics.events` | `analytics.ingested` |

## Database (PostgreSQL)
| Item | Convention | Example |
|------|-----------|---------|
| Tables | `snake_case` plural | `users`, `credit_transactions` |
| Columns | `snake_case` | `credit_balance`, `created_at` |
| Indexes | `idx_table_column` | `idx_users_email` |
| FK constraints | `fk_table_ref_table` | `fk_subscriptions_users` |

## API Routes
| Convention | Example |
|-----------|---------|
| REST resource | `/api/v1/users` |
| Nested resource | `/api/v1/users/:userId/credits` |
| Action endpoint | `/api/v1/auth/refresh` |
| Internal endpoint | `/internal/credits/lock` |
