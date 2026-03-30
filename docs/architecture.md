# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        EXTERNAL                              │
│                                                             │
│  User Browser ──────→ apps/web (Next.js)                    │
│  Developer App ─────→ SDK / REST API                        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                      API LAYER                               │
│                                                             │
│  apps/api (Fastify)  ◄──────────────────────────────────── │
│       │                                                     │
│       ├─── apps/auth-service     (JWT, Sessions)            │
│       ├─── apps/billing-service  (Razorpay)                 │
│       └─── apps/gateway          (Core Engine)              │
│                  │                                          │
│                  ├── apps/credit-service   (Wallet)         │
│                  └── apps/routing-service  (Providers)      │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     EVENT LAYER (Kafka)                      │
│                                                             │
│  Topics:                                                    │
│  auth.events   credit.events   billing.events               │
│  usage.events  routing.events  analytics.events             │
│                                                             │
│  apps/worker  ◄──── consumes all topics                     │
│  apps/analytics-service ◄──── consumes usage.events         │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    DATA LAYER                                │
│                                                             │
│  PostgreSQL    ← transactional (users, credits, billing)    │
│  ClickHouse    ← analytics (usage logs, cost tracking)      │
│  Redis         ← cache (sessions, rate limits, locks)       │
└─────────────────────────────────────────────────────────────┘
```

## Service Communication

| From | To | Method |
|------|----|--------|
| Gateway | Auth Service | HTTP (sync — request validation) |
| Gateway | Credit Service | HTTP (sync — lock/confirm/release) |
| Gateway | Routing Service | HTTP (sync — model call) |
| Any service | Analytics | Kafka (async — fire and forget) |
| Billing Service | Credit Service | HTTP (sync — add credits after payment) |
| Worker | PostgreSQL | Direct write (event processing) |

## Data Flow: Happy Path Request

```
1. App sends request → Gateway
2. Gateway → Auth Service: validate token
3. Gateway → Credit Service: check + lock credits
4. Gateway → Routing Service: call AI model
5. Routing Service → AI Provider: API call
6. Response flows back: Provider → Routing → Gateway
7. Gateway → Credit Service: confirm deduction
8. Gateway publishes to Kafka: usage.events
9. Analytics Service ingests into ClickHouse
10. Worker updates DEV wallet earnings
11. Gateway returns response to App
```

## Monorepo Package Graph

```
apps/gateway
  └── @ai-gateway/types
  └── @ai-gateway/utils
  └── @ai-gateway/config

apps/auth-service
  └── @ai-gateway/types
  └── @ai-gateway/utils
  └── @ai-gateway/config

apps/web
  └── @ai-gateway/ui
  └── @ai-gateway/types

packages/sdk-js
  └── @ai-gateway/types
```

## Scaling Strategy

### Phase 1 (Now): Single instances, Docker Compose
- Everything runs locally or on a single VM
- Docker Compose orchestrates all services

### Phase 2: Horizontal scaling
- Multiple gateway instances behind a load balancer
- Redis for shared state (sessions, rate limits)
- Kafka for decoupled async processing

### Phase 3: Kubernetes
- Each service as a Kubernetes deployment
- Auto-scaling based on request volume
- Managed PostgreSQL + Redis + Kafka (cloud-managed)
