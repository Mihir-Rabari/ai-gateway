# Agent 3 — Credit Service

**Owner:** Agent 3
**Scope:** `apps/credit-service/`
**Must NOT touch:** Other services, shared packages (read only)

---

## Your Mission

Build an atomic, race-condition-safe credit system. Credits are money. If the accounting is off — even by 1 — users will complain. The lock → confirm → release pattern must be bulletproof.

---

## Current State

- ✅ All 6 routes implemented (balance, check, lock, confirm, release, add)
- ✅ setnx + expire for atomic Redis lock
- ❌ Transaction history endpoint missing
- ❌ Low credit alert event missing
- ❌ Idempotency on confirm/release not implemented
- ❌ No tests

---

## Service Architecture

```
apps/credit-service/src/
├── index.ts
├── plugins/
│   ├── postgres.ts
│   ├── redis.ts
│   └── kafka.ts
├── routes/
│   └── creditRoutes.ts
├── services/
│   └── creditService.ts
└── repositories/
    └── creditRepository.ts   ← CREATE THIS
```

---

## Tasks

### Task 1 — Create CreditRepository

Move all SQL queries out of `creditService.ts` into a repository:

```typescript
// apps/credit-service/src/repositories/creditRepository.ts

export class CreditRepository {
  constructor(private readonly db: Pool) {}

  async getBalance(userId: string): Promise<number>
  async deductCredits(client: PoolClient, userId: string, amount: number): Promise<number>  // returns new balance
  async addCredits(client: PoolClient, userId: string, amount: number): Promise<number>
  async insertTransaction(client: PoolClient, tx: CreditTransactionRecord): Promise<void>
  async transactionExists(requestId: string): Promise<boolean>  // idempotency check
  async getTransactions(userId: string, limit: number, offset: number): Promise<CreditTransactionRecord[]>
}
```

### Task 2 — GET /credits/transactions

Add to `creditRoutes.ts`:
```typescript
fastify.get('/transactions', {
  schema: {
    querystring: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string' },
        limit: { type: 'number', default: 20 },
        offset: { type: 'number', default: 0 },
      },
    },
  },
}, async (req, reply) => {
  const { userId, limit, offset } = req.query;
  const transactions = await creditService.getTransactions(userId, limit, offset);
  return reply.send(ok({ transactions, userId }));
});
```

### Task 3 — Proper Atomic Lock with Lua Script

The current approach (setnx + expire) has a tiny TOCTOU window. Replace with a Lua script for true atomicity:

```typescript
const LOCK_LUA = `
  local key = KEYS[1]
  local value = ARGV[1]
  local ttl = tonumber(ARGV[2])
  if redis.call('EXISTS', key) == 0 then
    redis.call('SET', key, value)
    redis.call('EXPIRE', key, ttl)
    return 1
  else
    return 0
  end
`;

// In lock():
const wasSet = await this.redis.eval(LOCK_LUA, 1, lockKey, lockValue, lockTtl.toString());
if (wasSet !== 1) throw Errors.CREDIT_LOCK_FAILED();
```

### Task 4 — Idempotency on Confirm

If the same `requestId` is confirmed twice, skip silently instead of double-deducting:

```typescript
async confirm(userId: string, requestId: string): Promise<{ balanceAfter: number }> {
  // Check if already processed
  const exists = await creditRepo.transactionExists(requestId);
  if (exists) {
    const balance = await creditRepo.getBalance(userId);
    return { balanceAfter: balance };
  }
  // ... proceed with deduction
}
```

Add to `credit_transactions` table: a unique index on `request_id` where not null.

### Task 5 — Low Credit Alert

After every deduction, check if balance < 10:
```typescript
if (balanceAfter < 10) {
  void this.publishEvent('credit.low', userId, 0, requestId, balanceAfter);
}
```

This event can be consumed by the worker to send an email notification.

### Task 6 — Unit Tests

```typescript
// Test: lock + confirm deducts credits atomically
// Test: double confirm is idempotent
// Test: lock fails if insufficient balance
// Test: release removes lock and publishes event
// Test: addCredits increases balance correctly
```

---

## Credit Transaction Schema

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,          -- positive = credit, negative = debit
  type VARCHAR(20) NOT NULL,        -- 'debit' or 'credit'
  reason VARCHAR(255) NOT NULL,     -- 'request', 'subscription', 'refund'
  request_id UUID,                  -- nullable, for AI request deductions
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_credit_transactions_request_id
  ON credit_transactions(request_id)
  WHERE request_id IS NOT NULL;
```

---

## Env Vars

```env
DATABASE_URL=
REDIS_URL=
KAFKA_BROKERS=
CREDIT_SERVICE_PORT=3005
CREDIT_LOCK_TTL_SECONDS=30
```

---

## Do NOT Touch

- `apps/auth-service/` or any other service
- `infra/db/postgres-schema.sql` — if you need schema changes, document them and ask Agent 1
