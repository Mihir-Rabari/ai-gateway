# AI Gateway — MVP Task List
> **Total Agents:** 10 | **Target:** Full Working MVP | **Tracking:** Each task has an owner agent

---

## 🧭 How to Use This File

- Each section corresponds to one agent's ownership area
- Tasks are ordered by priority within each agent
- Status: `[ ]` = pending, `[/]` = in progress, `[x]` = done, `[!]` = blocked
- Agents must not modify code owned by other agents without coordination
- All agents read `docs/agents/general.md` + their task doc before starting

---

## Agent 1 — Infrastructure & DevOps

**Doc:** `docs/agents/tasks/01-infra.md`
**Owns:** `docker-compose.yml`, `infra/`, `.env.example`, `turbo.json`

- [x] Docker Compose with Postgres, Redis, Kafka, ClickHouse
- [x] PostgreSQL schema (users, subscriptions, credit_transactions, registered_apps, dev_wallets)
- [x] ClickHouse schema (request_logs, credit_events, revenue_events)
- [x] Kafka topic auto-creation config
- [x] Dockerfiles for all 8 services
- [x] Health check scripts (`scripts/healthcheck.sh`)
- [x] Docker Compose override file for development (`docker-compose.dev.yml`)
- [x] Makefile with common commands (`make up`, `make down`, `make migrate`, `make logs`)
- [x] Verify all containers start and are healthy
- [x] Kafka topic creation verification script
- [x] Database seed script (`infra/db/seed.sql` — test data for development)
- [x] ClickHouse schema initialization via HTTP API (not file mount — CH doesn't use initdb.d for SQL)
- [x] Fix docker-compose Kafka `KAFKA_ADVERTISED_LISTENERS` for host access

---

## Agent 2 — Auth Service

**Doc:** `docs/agents/tasks/02-auth-service.md`
**Owns:** `apps/auth-service/`

- [x] Signup endpoint (POST /auth/signup)
- [x] Login endpoint (POST /auth/login)
- [x] Refresh token endpoint (POST /auth/refresh)
- [x] Logout endpoint (POST /auth/logout)
- [x] Token validation endpoint (POST /internal/auth/validate)
- [x] JWT access + refresh tokens with Redis storage
- [x] Bcrypt password hashing
- [x] Kafka event publishing (user.created, user.login, user.logout)
- [x] User repository with PostgreSQL queries
- [x] Rate limiting on login (5 attempts per minute per IP)
- [x] Email validation + normalization on signup
- [x] Password strength validation
- [x] GET /auth/me endpoint (return current user from token)
- [ ] GET /users/:id endpoint (internal — for gateway use)
- [ ] Auth events consumer (listen to auth.events for audit log)
- [x] Unit tests for authService (mock Redis + Postgres)
- [ ] Integration test for full signup → login → refresh flow

---

## Agent 3 — Credit Service

**Doc:** `docs/agents/tasks/03-credit-service.md`
**Owns:** `apps/credit-service/`

- [x] GET /credits/balance?userId=
- [x] POST /credits/check (check if sufficient)
- [x] POST /credits/lock (atomic Redis reservation)
- [x] POST /credits/confirm (PostgreSQL deduction)
- [x] POST /credits/release (release lock on failure)
- [x] POST /credits/add (add credits — for billing webhooks)
- [x] GET /credits/transactions?userId=&limit=&offset= (transaction history)
- [x] Credit lock uses proper atomic SETNX with Lua eval for race condition safety
- [x] Credit lock TTL is configurable via env (`CREDIT_LOCK_TTL_SECONDS`)
- [x] Low credit alert event publish to Kafka (when balance < 10)
- [x] User repository using the shared DB pool
- [x] Full unit tests for CreditService (lock → confirm → release flow)
- [ ] Integration test with real Redis (testcontainers or separate Redis)
- [x] Idempotency: confirm/release use requestId deduplication

---

## Agent 4 — Gateway Service (AI Request Engine)

**Doc:** `docs/agents/tasks/04-gateway-service.md`
**Owns:** `apps/gateway/`

- [x] POST /gateway/request (main AI request endpoint)
- [x] GET /gateway/models (list available models)
- [x] Token validation via auth-service (internal HTTP call)
- [x] Credit lock → confirm → release flow
- [x] Kafka usage event publishing
- [x] App API key validation (validate `x-app-id` header against registered_apps table)
- [x] Request ID generation + response headers
- [x] Streaming response support (SSE or chunked transfer)
- [x] Request timeout handling (30s timeout, release credits on timeout)
- [x] Retry logic for transient provider errors (via `withRetry` from utils)
- [x] Full gateway plugin setup (postgres, redis, kafka)
- [x] Rate limiting per user per minute
- [x] GET /gateway/status endpoint (health + provider availability)
- [ ] Unit tests for GatewayService mocking all external calls
- [ ] Integration test: mock auth + credit, real routing call

---

## Agent 5 — Routing Service

**Doc:** `docs/agents/tasks/05-routing-service.md`
**Owns:** `apps/routing-service/`

- [x] POST /internal/routing/route (main routing endpoint)
- [x] GET /internal/routing/providers (list provider health)
- [x] OpenAI integration (chat completions)
- [x] Anthropic integration (messages API)
- [x] Automatic fallback on provider failure
- [x] Google Gemini integration (via `@google/generative-ai`)
- [x] Provider health tracking (Redis-backed — mark unhealthy for 60s on failure)
- [x] Streaming support (pass through SSE from provider)
- [x] Model-to-provider mapping with proper fallback chain
- [ ] Provider latency tracking (publish latency to Kafka)
- [x] Circuit breaker pattern (stop routing to provider after 5 consecutive failures)
- [ ] Unit tests for RoutingService (mock OpenAI + Anthropic clients)
- [ ] Integration test: real OpenAI call (with test API key)

---

## Agent 6 — Billing Service

**Doc:** `docs/agents/tasks/06-billing-service.md`
**Owns:** `apps/billing-service/`

- [x] GET /billing/plans
- [x] POST /billing/subscribe (create Razorpay subscription)
- [x] POST /billing/webhooks/razorpay (handle subscription events)
- [x] Razorpay webhook signature verification (HMAC SHA256)
- [x] Handle `subscription.activated` → upgrade plan + add credits
- [x] Handle `subscription.charged` → add monthly credits
- [x] Handle `subscription.cancelled` → downgrade to free plan
- [x] Handle `payment.failed` → notify user (Kafka event)
- [x] GET /billing/subscription?userId= (current subscription status)
- [x] POST /billing/cancel (cancel current subscription)
- [x] Credit addition calls credit-service HTTP API (not direct DB)
- [x] Webhook idempotency (store processed event IDs in Redis)
- [ ] Unit tests for BillingService (mock Razorpay + credit-service)
- [ ] Webhook test with Razorpay test events

---

## Agent 7 — Analytics Service + Worker

**Doc:** `docs/agents/tasks/07-analytics-worker.md`
**Owns:** `apps/analytics-service/`, `apps/worker/`

- [x] Kafka consumer for `usage.events`
- [x] ClickHouse batch insertion (100 events or 1s interval)
- [x] GET /analytics/usage/me?userId= (monthly stats)
- [x] Worker: revenue split (20% to developer wallet)
- [x] GET /analytics/usage/app?appId= (per-app usage for devs)
- [x] GET /analytics/dashboard?userId= (dashboard summary — requests, tokens, credits, models used)
- [ ] GET /analytics/models (global model usage breakdown)
- [x] ClickHouse schema initialization fix (use HTTP API on startup, not file mount)
- [x] Worker: handle `billing.events` (subscription lifecycle tracking)
- [x] Worker: handle `auth.events` (user creation tracking)
- [x] Error handling for bad Kafka messages (dead letter logging)
- [x] Analytics service graceful shutdown (flush batch before exit)
- [ ] Unit tests for batch flush logic

---

## Agent 8 — API Aggregation Layer

**Doc:** `docs/agents/tasks/08-api-service.md`
**Owns:** `apps/api/`

- [x] Placeholder src/index.ts
- [x] Implement the full API aggregation service
- [x] Unified CORS + rate limiting middleware
- [x] POST /api/v1/chat (proxy to gateway-service)
- [x] GET /api/v1/me (proxy to auth-service)
- [x] GET /api/v1/credits (proxy to credit-service)
- [x] GET /api/v1/usage (proxy to analytics-service)
- [x] GET /api/v1/models (list available models)
- [x] POST /api/v1/apps (register developer app — proxy to DB)
- [x] GET /api/v1/apps (list developer's apps)
- [x] DELETE /api/v1/apps/:id
- [x] POST /api/v1/apps/:id/keys (generate API key)
- [x] OpenAPI/Swagger spec auto-generation (`@fastify/swagger`)
- [x] Request logging middleware (log requestId, userId, latency)
- [x] Proper auth middleware (validate JWT on all protected routes)

---

## Agent 9 — Frontend (Web App)

**Doc:** `docs/agents/tasks/09-frontend.md`
**Owns:** `apps/web/`

- [x] Next.js bootstrapped with Tailwind v4
- [x] Landing page (hero, how it works, pricing, developer section)
- [x] Login page
- [x] Signup page
- [x] Dashboard layout (sidebar navigation)
- [x] Dashboard overview (credits, stats, quick actions)
- [x] Playground page (AI model chat)
- [x] Usage page (monthly stats + credit bars)
- [x] Billing page (plan comparison + Razorpay CTAs)
- [x] Settings page (profile + API key + SDK quickstart)
- [x] **FIX: Rebuild landing page using shadcn/ui components** (current has Tailwind issues)
- [x] Install shadcn/ui in `apps/web` (latest — v2+)
- [x] Migrate all dashboard pages to use shadcn components (Card, Button, Input, Badge, etc.)
- [x] Auth popup page (`/auth/popup`) — minimal login form in iframe
- [x] Developer portal (`/dev`) — app registration, API key management
- [x] Developer earnings page (`/dev/earnings`) — wallet balance + transaction history
- [x] Real-time credit balance update (poll every 30s or SSE)
- [x] Toast notifications (login success, credit low warning)
- [x] Mobile responsive sidebar (hamburger menu)
- [x] Dark mode enforced (already dark — just ensure no light mode fallback)
- [x] Error boundary components
- [x] Loading skeleton states

---

## Agent 10 — SDK + Auth Widget

**Doc:** `docs/agents/tasks/10-sdk-auth-widget.md`
**Owns:** `packages/sdk-js/`, auth widget frontend JS

- [x] Finish SDK implementation (`packages/sdk-js/src/index.ts`)
- [x] `ai.chat()` method — full request flow
- [x] `ai.stream()` method — streaming response
- [x] `ai.credits()` — get current balance
- [x] `AIGateway.signIn()` — opens auth popup window (`/auth/popup`)
- [x] Popup `postMessage` protocol (send token back to parent)
- [x] SDK TypeScript types + JSDoc
- [x] SDK README with full usage examples
- [x] `npm publish` ready (proper package.json exports)
- [x] Browser-compatible build (ESM + CJS)
- [x] SDK integration test (mock gateway, verify request shape)
- [x] Standalone auth widget JS file (`packages/sdk-js/dist/widget.js`)
- [x] CDN-ready bundle for `<script>` tag usage

---

## 🔴 Critical Blockers (Must Fix for MVP)

- [ ] **Docker Desktop must be running** → `docker-compose up -d`
- [x] **ClickHouse init** — doesn't use `initdb.d` — needs HTTP API schema creation
- [x] **Kafka listener fix** — `KAFKA_ADVERTISED_LISTENERS` needs `PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092`
- [ ] **Landing page rebuild** — current Tailwind v4 has syntax issues, migrate to shadcn
- [ ] **.env real values** — `OPENAI_API_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` must be set

---

## 📊 Progress Overview

| Agent | Module | Status | % Done |
|-------|--------|--------|--------|
| 1 | Infra | Partial | 70% |
| 2 | Auth Service | Partial | 80% |
| 3 | Credit Service | Partial | 85% |
| 4 | Gateway | Done | 100% |
| 5 | Routing | Partial | 90% |
| 6 | Billing | Partial | 60% |
| 7 | Analytics + Worker | Partial | 65% |
| 8 | API Layer | Done | 100% |
| 9 | Frontend | Done | 100% |
| 10 | SDK + Auth Widget | Done | 100% |

**Overall MVP Progress: ~70%**

---

## Backend Stabilization Sprint - Codex

Focus: backend-first completion and contract cleanup before the next frontend pass.

- [x] Add missing `api_keys` table to PostgreSQL schema
- [x] Add missing `user_events` table to PostgreSQL schema
- [x] Fix API -> billing-service subscription contract by injecting authenticated `userId`
- [x] Expose API routes for billing subscription status and cancellation
- [x] Add `/api/v1/usage/summary` alias for the current dashboard client
- [x] Restore `user.login` Kafka event publishing from auth-service
- [x] Add Razorpay plan ID placeholders to `.env.example`
- [x] Add runnable test scripts for auth-service and credit-service
- [x] Run and stabilize auth-service tests in CI/local pipeline
- [x] Run and stabilize credit-service tests in CI/local pipeline
- [x] Add billing-service unit tests for plan mapping and webhook handling
- [x] Add worker tests for `usage.events` and `auth.events`
- [x] Add API route tests for billing and usage alias coverage
- [ ] Reconcile gateway app-key behavior with SDK expectations
