# Tech Stack

## Backend
| Technology | Version | Role |
|-----------|---------|------|
| Node.js | 20 LTS | Runtime |
| TypeScript | 5.4 | Language |
| Fastify | 4.x | HTTP framework |
| `@fastify/jwt` | latest | JWT auth |
| `@fastify/cors` | latest | CORS |
| `@fastify/rate-limit` | latest | Rate limiting |
| `pg` | 8.x | PostgreSQL client |
| `ioredis` | 5.x | Redis client |
| `kafkajs` | 2.x | Kafka client |
| `bcrypt` | 5.x | Password hashing |
| `zod` | 3.x | Schema validation |

## Frontend
| Technology | Version | Role |
|-----------|---------|------|
| Next.js | 14 (App Router) | Framework |
| React | 18 | UI |
| Tailwind CSS | 3.x | Styling |
| Framer Motion | 11.x | Animations |
| TanStack Query | 5.x | Server state |
| Zustand | 4.x | Client state |
| React Hook Form | 7.x | Forms |

## Analytics
| Technology | Role |
|-----------|------|
| ClickHouse | OLAP analytics database |
| `@clickhouse/client` | ClickHouse Node.js client |

## Payments
| Technology | Role |
|-----------|------|
| Razorpay | Subscriptions + payments + payouts |
| `razorpay` (npm) | Official SDK |

## Messaging
| Technology | Role |
|-----------|------|
| Apache Kafka | Event streaming |
| KafkaJS | Node.js Kafka client |

## Infrastructure
| Technology | Role |
|-----------|------|
| Docker | Containerisation |
| Docker Compose | Local dev orchestration |
| Turborepo | Monorepo build system |
| pnpm | Package manager |

## Monitoring (Phase 3+)
| Technology | Role |
|-----------|------|
| Prometheus | Metrics |
| Grafana | Dashboards |
| Sentry | Error tracking |
