# Credit Module

## Purpose
The credit system is the financial spine of AI Gateway. Every AI request costs credits. If this breaks, you're giving away free AI. Take it seriously.

## Responsibilities
- Maintain credit balance per user
- Validate credits before processing requests
- Atomically lock credits during in-flight requests (prevents double-spend)
- Deduct credits on request completion
- Release locks on request failure
- Add credits on subscription/top-up
- Maintain full transaction log

## Critical Logic: Lock → Confirm or Release

```
1. Check balance     → Is balance >= required credits?
2. Lock credits      → Atomic Redis lock (SETNX) — reserve credits
3. Process request   → Call routing service / AI provider
4. Confirm deduction → Move locked credits to deducted (PostgreSQL)
5. Release lock      → Remove Redis lock

On failure at step 3+:
  → Release lock → Do NOT deduct from balance
```

This prevents:
- Negative balances
- Double-deduction on retries
- Credit leaks on partial failures

## Credit Locking (Redis)
```
Key:   credit_lock:<userId>:<requestId>
Value: { amount, lockedAt }
TTL:   30 seconds (auto-release if service crashes)
```

```typescript
// Pseudocode for atomic lock
const lockKey = `credit_lock:${userId}:${requestId}`;
const locked = await redis.set(lockKey, JSON.stringify({ amount }), 'NX', 'EX', 30);
if (!locked) throw new Error('CREDIT_002: Credit lock failed');
```

## Data Models

### User Credits (PostgreSQL — lives on users table)
```sql
credit_balance INTEGER NOT NULL DEFAULT 0
```

### Credit Transactions (PostgreSQL)
```sql
credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,        -- positive = credit, negative = debit
  type TEXT NOT NULL,             -- 'debit' | 'credit'
  reason TEXT NOT NULL,           -- 'request' | 'subscription' | 'refund'
  request_id UUID,                -- linked gateway request
  balance_after INTEGER NOT NULL, -- balance snapshot after transaction
  created_at TIMESTAMP
)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/credits/balance` | Access token | Get current balance |
| GET | `/credits/transactions` | Access token | Get transaction history |
| POST | `/internal/credits/check` | Internal | Check if balance is sufficient |
| POST | `/internal/credits/lock` | Internal | Lock credits for request |
| POST | `/internal/credits/confirm` | Internal | Confirm deduction |
| POST | `/internal/credits/release` | Internal | Release lock (on failure) |
| POST | `/internal/credits/add` | Internal | Add credits (billing service calls this) |

## Events Published
| Topic | Event Type | When |
|-------|-----------|------|
| `credit.events` | `credit.deducted` | After successful deduction |
| `credit.events` | `credit.added` | After credits added |
| `credit.events` | `credit.locked` | After lock acquired |
| `credit.events` | `credit.released` | After lock released |

## Credit Costs (per 1000 tokens)
| Model | Credits |
|-------|---------|
| GPT-3.5 Turbo | 1 credit |
| GPT-4o | 10 credits |
| Claude 3 Haiku | 2 credits |
| Claude 3.5 Sonnet | 12 credits |
| Gemini Flash | 1 credit |
| Gemini Pro | 8 credits |
