# AI Gateway

> A unified infrastructure layer that connects users, AI applications, and model providers into a single system.

## What It Is

AI Gateway acts as:
- **Identity layer** — Login with AI Gateway (one account across all AI apps)
- **Billing layer** — Credits & subscriptions (one wallet, multiple apps)
- **Routing layer** — Connects apps to AI model providers intelligently
- **Monetization layer** — Developers earn automatically per usage

## Monorepo Structure

```
ai-gateway/
├── apps/
│   ├── web/                  # Landing + dashboard (Next.js)
│   ├── api/                  # Main backend API (Fastify)
│   ├── gateway/              # Core request engine
│   ├── auth-service/         # Auth + token service
│   ├── billing-service/      # Razorpay + subscriptions
│   ├── credit-service/       # Wallet + credit logic
│   ├── routing-service/      # Model routing + fallback
│   ├── analytics-service/    # ClickHouse ingestion
│   └── worker/               # Kafka consumers
│
├── packages/
│   ├── sdk-js/               # JavaScript SDK
│   ├── ui/                   # Shared React components
│   ├── config/               # Shared config + env schemas
│   ├── types/                # Shared TypeScript types
│   └── utils/                # Shared helpers
│
├── infra/
│   ├── docker/               # Dockerfiles per service
│   ├── kafka/                # Kafka topic configs
│   └── db/                   # PostgreSQL + ClickHouse schemas
│
└── docs/
    ├── agents/               # Coding agent guidelines
    ├── modules/              # Module documentation
    ├── architecture.md
    └── techstack.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + TypeScript + Fastify |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Messaging | Apache Kafka |
| Primary DB | PostgreSQL |
| Analytics DB | ClickHouse |
| Cache | Redis |
| Payments | Razorpay |
| Infra | Docker + Docker Compose |

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

### Install dependencies
```bash
pnpm install
```

### Start infrastructure (Postgres, Redis, Kafka, ClickHouse)
```bash
docker-compose up -d
```

### Run DB migrations
```bash
pnpm --filter @ai-gateway/api db:migrate
```

### Start all services in dev mode
```bash
pnpm dev
```

### Start all services with PM2 (recommended for persistent processes)

Install PM2 globally if you haven't already:
```bash
npm install -g pm2
```

**Development** — starts all services with hot-reload (`tsx watch` / `next dev`):
```bash
pnpm pm2:dev
```

**Production** — starts all services from compiled output (`node dist/index.js` / `next start`):
```bash
pnpm build        # build all services first
pnpm pm2:start
```

**Useful PM2 commands:**
```bash
pnpm pm2:status   # view status of all processes
pnpm pm2:logs     # tail logs from all services
pnpm pm2:stop     # stop all services
pnpm pm2:delete   # remove all services from PM2
```

## Build Phases

### Phase 1 (Core MVP)
- Auth Module
- Gateway Core
- Credit System
- Basic SDK
- One model integration (OpenAI)

### Phase 2 (Make It Usable)
- Billing (Razorpay subscriptions)
- User Dashboard
- Dev SDK improvements
- Usage tracking

### Phase 3 (Make It Valuable)
- Revenue sharing + Dev wallet
- Dev dashboard + Earnings
- Analytics (ClickHouse)
- Admin panel

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [Tech Stack](./docs/techstack.md)
- [Agent Guidelines](./docs/agents/)
- [Module Docs](./docs/modules/)

---

*Build once. Earn automatically.*
