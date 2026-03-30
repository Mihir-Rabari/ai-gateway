# Agent 1 — Infrastructure & DevOps

**Owner:** Agent 1
**Scope:** `docker-compose.yml`, `infra/`, `.env.example`, `Makefile`, `scripts/`
**Must NOT touch:** Any `apps/` or `packages/` source code

---

## Your Mission

Make the entire infrastructure run reliably with a single command. Every developer on the team (and every other agent) depends on your work being solid. If the database doesn't start, nothing works.

---

## Context

The monorepo runs 9 apps + 4 infrastructure services:
- **PostgreSQL 16** — primary database (port 5432)
- **Redis 7** — cache, sessions, rate limiting (port 6379)
- **Kafka + Zookeeper** — event streaming (port 9092)
- **ClickHouse 24** — analytics database (port 8123)

All service configs are in `docker-compose.yml`. Schemas are in `infra/db/`.

---

## Critical Issues to Fix First

### 1. Kafka Listener Configuration (BROKEN)
The current `docker-compose.yml` has:
```yaml
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
```
This is **wrong** — containers can't reach Kafka by `localhost`. Fix to:
```yaml
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT_INTERNAL
KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,PLAINTEXT_INTERNAL://0.0.0.0:29092
```
And other containers should connect to `kafka:29092` (not `localhost:9092`).

### 2. ClickHouse Schema Initialization (BROKEN)
ClickHouse **does NOT** use `/docker-entrypoint-initdb.d/` for SQL files like Postgres does.
You must initialize ClickHouse schema via HTTP API on first startup.

Create `infra/db/init-clickhouse.sh`:
```bash
#!/bin/bash
# Wait for ClickHouse to be healthy, then apply schema
until curl -sf "http://localhost:8123/ping"; do sleep 2; done
curl -X POST "http://localhost:8123/" --data-binary @/infra/db/clickhouse-schema.sql
```

Or better: use a `clickhouse-init` service in docker-compose that runs after ClickHouse is healthy.

### 3. Env Variable Defaults
The `.env.example` has `REDIS_PASSWORD=` (empty). The Redis container runs without a password. This is fine for dev, but document it clearly.

---

## Tasks

### Phase A — Fix docker-compose.yml

- [ ] Fix Kafka listener config (see above)
- [ ] Add `kafka-init` service that creates topics after Kafka is healthy:
  ```yaml
  kafka-init:
    image: confluentinc/cp-kafka:7.6.1
    depends_on:
      kafka:
        condition: service_healthy
    entrypoint: [ '/bin/sh', '-c' ]
    command: |
      kafka-topics --create --if-not-exists --topic usage.events --bootstrap-server kafka:29092
      kafka-topics --create --if-not-exists --topic credit.events --bootstrap-server kafka:29092
      kafka-topics --create --if-not-exists --topic auth.events --bootstrap-server kafka:29092
      kafka-topics --create --if-not-exists --topic billing.events --bootstrap-server kafka:29092
      kafka-topics --create --if-not-exists --topic routing.events --bootstrap-server kafka:29092
  ```
- [ ] Add `clickhouse-init` service that applies schema via HTTP API
- [ ] Add healthchecks for all services
- [ ] Add `restart: unless-stopped` to all services

### Phase B — Add Docker Compose Dev Override

Create `docker-compose.dev.yml` with:
- Volume mounts for live code reloading
- Debug-friendly logging
- Kafka UI enabled (port 8080)

### Phase C — Makefile

Create `Makefile` at the project root:
```makefile
.PHONY: up down logs ps migrate clean

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

ps:
	docker-compose ps

migrate:
	@echo "Migrations run automatically via Postgres docker-entrypoint-initdb.d"

clean:
	docker-compose down -v
	rm -rf node_modules .turbo

dev:
	pnpm install && pnpm turbo dev
```

### Phase D — Seed Data

Create `infra/db/seed.sql` for development:
```sql
-- Test user: test@example.com / password123
INSERT INTO users (id, email, name, password_hash, plan_id, credit_balance)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'test@example.com',
  'Test User',
  '$2b$12$...', -- bcrypt hash of 'password123'
  'pro',
  1000
) ON CONFLICT DO NOTHING;
```

### Phase E — Health Check Script

Create `scripts/healthcheck.sh`:
```bash
#!/bin/bash
echo "Checking Postgres..."
docker-compose exec postgres pg_isready -U gateway_user

echo "Checking Redis..."
docker-compose exec redis redis-cli ping

echo "Checking Kafka..."
docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092

echo "Checking ClickHouse..."
curl -sf http://localhost:8123/ping && echo "OK"
```

---

## Files You Own

```
docker-compose.yml          ← MODIFY: fix Kafka + add init services
docker-compose.dev.yml      ← CREATE: dev override
Makefile                    ← CREATE: convenience commands
infra/
├── db/
│   ├── postgres-schema.sql   ← Already exists, verify it's correct
│   ├── clickhouse-schema.sql ← Already exists
│   ├── init-clickhouse.sh    ← CREATE: schema init script
│   └── seed.sql              ← CREATE: dev seed data
├── docker/
│   └── *.Dockerfile          ← Verify all exist for each service
├── kafka/
│   └── topics.sh             ← CREATE: topic creation script
scripts/
└── healthcheck.sh            ← CREATE: infra health verification
```

---

## Important Notes

- **Never hardcode passwords** — always use env var substitution in docker-compose
- The Postgres schema auto-applies because we mount it to `/docker-entrypoint-initdb.d/` — this runs ONLY on first container creation
- After fixing Kafka: all services that use Kafka must connect to `kafka:29092` internally, `localhost:9092` from host
- Update `.env.example` with `KAFKA_BROKERS=localhost:9092` for host access (this is what the dev services use when running outside Docker)
