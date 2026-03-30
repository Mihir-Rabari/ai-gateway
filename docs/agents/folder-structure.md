# Folder Structure

## Each Backend Service
```
apps/<service-name>/
 ├── package.json
 ├── tsconfig.json
 └── src/
      ├── index.ts              # Server bootstrap — register plugins, routes, start server
      ├── routes/
      │   └── <resource>Routes.ts   # Route definitions + schema validation
      ├── controllers/
      │   └── <resource>Controller.ts  # Request parsing, response formatting
      ├── services/
      │   └── <resource>Service.ts     # Business logic
      ├── repositories/
      │   └── <resource>Repository.ts  # DB queries
      ├── models/
      │   └── <resource>.ts            # TypeScript interfaces for DB models
      ├── events/
      │   └── <resource>Events.ts      # Kafka event publishers
      ├── plugins/
      │   ├── postgres.ts              # Fastify PostgreSQL plugin
      │   ├── redis.ts                 # Fastify Redis plugin
      │   └── kafka.ts                 # Fastify Kafka plugin
      └── types/
          └── index.ts                 # Local types for this service
```

## Shared Packages
```
packages/<package-name>/
 ├── package.json
 ├── tsconfig.json
 └── src/
      └── index.ts             # All exports
```

## Frontend (apps/web)
```
apps/web/
 ├── package.json
 ├── tsconfig.json
 ├── next.config.js
 ├── tailwind.config.ts
 └── src/
      ├── app/
      │   ├── (landing)/       # Public pages — route group
      │   ├── (dashboard)/     # Auth-protected user dashboard
      │   ├── (dev)/           # Developer dashboard
      │   └── api/             # Next.js API routes (BFF)
      ├── components/
      │   ├── ui/              # Reusable UI primitives
      │   └── features/        # Feature-specific components
      ├── hooks/               # Custom React hooks
      ├── stores/              # Zustand state stores
      ├── services/            # API call wrappers
      └── types/               # Frontend TypeScript types
```

## Infra
```
infra/
 ├── docker/
 │   ├── Dockerfile.api
 │   ├── Dockerfile.gateway
 │   ├── Dockerfile.auth-service
 │   ├── Dockerfile.billing-service
 │   ├── Dockerfile.credit-service
 │   ├── Dockerfile.routing-service
 │   ├── Dockerfile.analytics-service
 │   ├── Dockerfile.worker
 │   └── Dockerfile.web
 ├── kafka/
 │   └── topics.json
 └── db/
     ├── postgres-schema.sql
     └── clickhouse-schema.sql
```
