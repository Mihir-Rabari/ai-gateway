# AI Gateway — Master Plan
> **Version:** 1.0 | **Status:** Active Development | **Target:** MVP

---

## 🏗️ Vision

Build a **production-ready AI credits gateway** that:
- Lets **users** buy credits once and use them across any AI-powered app
- Lets **developers** build apps on top of AI models without managing API keys or billing
- Routes **AI requests** to OpenAI, Anthropic, and Google with automatic fallback
- Tracks **usage, spending, and revenue** in real-time

---

## 🧱 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                  │
│   Landing Page │ Dashboard │ Dev Portal │ Auth Widget   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (REST)
┌────────────────────────▼────────────────────────────────┐
│                   API Gateway (:3001)                    │
│           Aggregation + Rate Limiting + Auth            │
└────┬─────────────┬────────────┬───────────┬────────────┘
     │             │            │           │
  ┌──▼──┐      ┌───▼──┐    ┌───▼──┐   ┌───▼────┐
  │Auth │      │Credit│    │Route │   │Billing │
  │:3003│      │:3005 │    │:3006 │   │:3004   │
  └──┬──┘      └───┬──┘    └───┬──┘   └───┬────┘
     │             │            │           │
     └──────────── Kafka ────────────────┘
                     │
            ┌────────▼────────┐
            │   Worker + Analytics   │
            │ :3008 (Kafka consumer) │
            │ :3007 (ClickHouse API) │
            └─────────────────┘
```

---

## 📦 Monorepo Structure

```
gateway/
├── apps/
│   ├── web/               # Next.js — Landing + Dashboard + Dev Portal
│   ├── api/               # Main public API (aggregation layer)
│   ├── auth-service/      # JWT auth, user management
│   ├── gateway/           # Core AI request engine
│   ├── credit-service/    # Credit wallet + transactions
│   ├── billing-service/   # Razorpay subscriptions + webhooks
│   ├── routing-service/   # Model routing + fallback
│   ├── analytics-service/ # ClickHouse ingestion + queries
│   └── worker/            # Kafka consumers (revenue split)
├── packages/
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Logger, errors, helpers
│   ├── config/            # Zod-validated env config
│   ├── ui/                # Shared React components (shadcn)
│   └── sdk-js/            # JavaScript SDK
├── infra/
│   ├── db/                # PostgreSQL + ClickHouse schemas
│   ├── docker/            # Dockerfiles per service
│   └── kafka/             # Topic configs
└── docs/
    ├── agents/            # Agent instruction docs
    │   └── tasks/         # Per-agent task assignments
    ├── modules/           # Module-level docs
    └── architecture.md
```

---

## 🛢️ Data Layer

### PostgreSQL (Primary)
| Table | Purpose |
|-------|---------|
| `users` | User accounts, plan, credit balance |
| `subscriptions` | Razorpay subscription records |
| `credit_transactions` | Debit/credit ledger |
| `registered_apps` | Developer-registered apps |
| `dev_wallets` | Developer revenue wallet |
| `dev_wallet_transactions` | Revenue earning history |
| `api_keys` | App API keys |
| `refresh_tokens` | Refresh token rotation store |

### Redis (Cache)
| Key Pattern | Purpose |
|------------|---------|
| `refresh:{userId}:{jti}` | Refresh token store |
| `credit_lock:{userId}:{requestId}` | Credit reservation lock |
| `blacklist:{tokenSuffix}` | JWT blacklist |
| `ratelimit:{ip}` | Rate limiting counter |

### ClickHouse (Analytics)
| Table | Purpose |
|-------|---------|
| `request_logs` | Every AI request (tokens, latency, model) |
| `credit_events` | Credit deductions timeline |
| `revenue_events` | Developer revenue events |

### Kafka Topics
| Topic | Producer | Consumer |
|-------|---------|---------|
| `usage.events` | Gateway | Worker, Analytics |
| `credit.events` | Credit Service | Worker |
| `auth.events` | Auth Service | Worker |
| `billing.events` | Billing Service | Worker |
| `routing.events` | Routing Service | Analytics |

---

## 🔐 Auth Flow

```
1. POST /auth/signup → hash password → create user (100 credits) → issue JWT pair
2. POST /auth/login  → verify credentials → issue JWT pair → store refresh in Redis
3. POST /auth/refresh → verify refresh → rotate token pair
4. POST /auth/logout → delete refresh from Redis → blacklist access token
5. Internal: POST /internal/auth/validate → verify token → return {userId, planId}
```

**"Sign in with AI Gateway" Widget** (for third-party apps):
- Developer embeds `<script src="https://cdn.ai-gateway.io/sdk.js">`
- Calls `AIGateway.signIn()` which opens a popup to `/auth/popup`
- `/auth/popup` is a dedicated Next.js page with a minimal login form
- On success, `postMessage` sends the access token back to the parent window
- Parent app stores the token and uses it for Gateway API calls

---

## 💳 Credit System

```
Request Flow:
1. Check balance → INSUFFICIENT_CREDITS if < estimated cost
2. Lock credits (Redis SETNX) → CREDIT_LOCK_FAILED if race condition
3. Route to AI model
4. Confirm deduction (PostgreSQL atomic UPDATE)
5. Release lock from Redis
6. Publish usage event to Kafka

Credit Pricing (per 1k tokens):
- GPT-4o: 10 credits
- GPT-4 Turbo: 8 credits
- GPT-3.5 Turbo: 1 credit
- Claude 3.5 Sonnet: 12 credits
- Claude 3 Haiku: 2 credits
- Gemini 1.5 Pro: 8 credits
- Gemini 1.5 Flash: 1 credit
```

---

## 💰 Revenue Model

| Plan | Price | Credits/mo | Models |
|------|-------|-----------|--------|
| Free | ₹0 | 100 | Limited models |
| Pro | ₹499/mo | 1,000 | All models |
| Max | ₹1,499/mo | 5,000 | All models + priority |

**Developer Revenue Split:**
- Developers earn **20% of credits** consumed through their apps
- Tracked via `dev_wallet_transactions` + Kafka worker
- Withdrawable monthly via Razorpay Payout API (Phase 3)

---

## 🎨 Frontend Architecture

### Tech Stack
- **Next.js 15** (App Router)
- **Tailwind CSS v4** (utility-first)
- **shadcn/ui** (component library — auto-installs via CLI)
- **Space/dark theme** — monochrome with subtle gradients

### Pages
| Route | Description |
|-------|------------|
| `/` | Landing page (cinematic hero, pricing, how it works) |
| `/login` | Sign in form |
| `/signup` | Create account form |
| `/auth/popup` | Minimal auth popup for SDK integration |
| `/dashboard` | User overview (credits, usage, quick actions) |
| `/dashboard/playground` | AI model playground |
| `/dashboard/usage` | Usage analytics + charts |
| `/dashboard/billing` | Plans + subscription management |
| `/dashboard/settings` | Profile + API key + SDK quick start |
| `/dev` | Developer portal (register app, manage API keys) |
| `/dev/apps` | App list |
| `/dev/apps/[id]` | App details + analytics |
| `/dev/earnings` | Revenue wallet + transaction history |
| `/dev/docs` | SDK documentation |
| `/admin` | Admin panel (Phase 3) |

---

## 🔌 SDK Design

```typescript
// @ai-gateway/sdk-js usage
import { AIGateway } from '@ai-gateway/sdk-js';

const ai = new AIGateway({
  apiKey: 'agk_...',       // User's API key
  appId: 'app_...',        // Developer's app ID
});

// Chat with any model
const result = await ai.chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Auth widget (for "Sign in with AI Gateway")
const token = await AIGateway.signIn({ appId: 'app_...' });
```

---

## 📊 MVP Definition

The following must work end-to-end for MVP:

1. ✅ User can signup → get 100 credits
2. ✅ User can login → get JWT tokens
3. ✅ User can call gateway → credits deduct → AI model responds
4. ✅ Usage tracked in ClickHouse
5. ✅ Developer can earn 20% revenue split via worker
6. ✅ User can upgrade plan via Razorpay
7. ✅ Frontend dashboard shows real-time credit balance + usage
8. ✅ SDK works (`npm install @ai-gateway/sdk-js`)
9. ✅ "Sign in with AI Gateway" popup works
10. ✅ All services run via `docker-compose up`

---

## 🚀 Phase Plan

### Phase 1 — Foundation (DONE ✅)
- Monorepo scaffolding
- All 8 backend services implemented
- Landing page live
- TypeScript compiles cleanly (16/16)

### Phase 2 — Integration (CURRENT 🔄)
- Fix frontend (landing page + dashboard with shadcn)
- Auth popup page for SDK
- DB migrations running
- Docker infra verified
- E2E test: signup → gateway request → credit deduction

### Phase 3 — Production Polish
- Developer portal (app registration, API key management)
- Developer earnings + wallet
- Razorpay webhook verification in staging
- ClickHouse analytics dashboard
- Admin panel
- SDK improvements + documentation site
- Rate limiting (per-plan)
- Email notifications (Resend/Postmark)

### Phase 4 — Launch
- Production deployment (Railway / Vercel / GCP)
- Kubernetes configs
- Monitoring (Prometheus + Grafana)
- Error tracking (Sentry)
- Status page
- Public API docs (Swagger/OpenAPI)

---

## ⚙️ Environment Setup

```bash
# 1. Clone + install
pnpm install

# 2. Copy env
cp .env.example .env
# Edit .env with real keys

# 3. Start infrastructure
docker-compose up -d

# 4. Run DB migrations (after postgres is healthy)
# psql runs automatically via docker-entrypoint-initdb.d

# 5. Start all services
pnpm turbo dev

# OR start specific service
pnpm --filter @ai-gateway/auth-service dev
```

---

## 🔑 Required Environment Variables (Dev)

```env
DATABASE_URL=postgresql://gateway_user:gateway_pass@localhost:5432/ai_gateway
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
CLICKHOUSE_HOST=http://localhost:8123

JWT_ACCESS_SECRET=<any-32-char-string>
JWT_REFRESH_SECRET=<any-32-char-string>

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

---

## Backend Stabilization Snapshot (2026-04-04)

This repository is in an active backend stabilization pass. The most important completed fixes in this pass are:

- API billing proxy now derives `userId` from the authenticated request before calling billing-service
- API exposes a `/api/v1/usage/summary` compatibility alias for the current dashboard client
- Auth-service now emits `user.login` events again
- PostgreSQL schema now includes the `api_keys` and `user_events` tables used by runtime code
- Razorpay plan IDs are now expected as explicit env vars instead of assuming local plan names are valid provider plan IDs

Current backend gaps still remaining:

- Gateway auth/app-key semantics still need a dedicated cleanup pass
- API route tests are still incomplete
- Some planning sections above still reflect target-state MVP claims rather than shipped-state reality

Additional stabilization progress since this snapshot:

- Gateway now returns explicit invalid app-key errors for bad developer keys and has unit coverage for first-party app bypass + key validation
- Routing-service now has injectable provider clients for unit testing and coverage for primary routing, fallback behavior, and provider health reporting
