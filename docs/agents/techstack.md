# Tech Stack Reference

## Backend Services
| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 20 (LTS) | Mature, fast, huge ecosystem |
| Language | TypeScript 5 | Type safety across the whole monorepo |
| Framework | Fastify | 2x faster than Express, built-in schema validation |
| Messaging | Apache Kafka | Durable, ordered, replay-capable event streaming |
| Monorepo | Turborepo + pnpm | Fast builds, shared packages, workspace management |

## Databases
| Database | Use Case |
|----------|---------|
| PostgreSQL | Users, subscriptions, credits, auth, transactions |
| ClickHouse | Usage logs, cost tracking, analytics queries |
| Redis | Sessions, rate limiting, credit locks, token cache |

## Frontend
| Technology | Why |
|-----------|-----|
| Next.js 14 (App Router) | SSR, RSC, routing, API routes, great DX |
| Tailwind CSS | Utility-first, consistent design tokens |
| Framer Motion | Smooth animations, cinematic page transitions |
| TanStack Query | Server state, caching, mutations |
| Zustand | Lightweight client state |

## Payments
| Technology | Why |
|-----------|-----|
| Razorpay | India-first, excellent subscription support, easy webhooks |

## Infrastructure
| Technology | Use Case |
|-----------|---------|
| Docker | All services containerized |
| Docker Compose | Local dev stack orchestration |
| Kubernetes | Future production orchestration (Phase 3+) |

## AI Providers
| Provider | Models |
|---------|-------|
| OpenAI | GPT-4o, GPT-4 Turbo, GPT-3.5 |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Haiku |
| Google | Gemini 1.5 Pro, Gemini Flash |

## Tooling
| Tool | Purpose |
|-----|---------|
| ESLint | Linting |
| Prettier | Code formatting |
| Vitest | Unit testing |
| Playwright | E2E testing |
