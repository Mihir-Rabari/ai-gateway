# Revenue Module

## Purpose
Automatically split revenue between AI Gateway margin, model provider costs, and developer earnings — every single request.

## Revenue Split Logic

### Per Request
```
User credits deducted
  = Provider cost (in credits)
  + Developer earning (in credits)
  + AI Gateway margin (in credits)
```

### Example (GPT-4o, 1000 tokens = 10 credits)
```
Total credits charged:  10 credits
Provider cost:           6 credits (60% — actual API cost)
Developer earning:       2 credits (20% — dev's share)
AI Gateway margin:       2 credits (20% — platform margin)
```

## Developer Wallet
Each registered developer app has a wallet:
```sql
dev_wallets (
  id UUID PRIMARY KEY,
  developer_id UUID REFERENCES users(id),
  balance NUMERIC(10, 4) DEFAULT 0,     -- in INR equivalent
  total_earned NUMERIC(10, 4) DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Earning Calculation Flow
```
usage.events consumed by worker
  → Calculate developer earning based on tokens used
  → Add to dev wallet (PostgreSQL)
  → Track in analytics
```

## Payout System (Phase 3)
```
Developer requests payout (min ₹500)
  → Verify KYC (manual or via Razorpay)
  → Process payout via Razorpay Payout API
  → Update wallet balance
  → Send payout confirmation
```

## Revenue Split Rates
| Category | Rate | Notes |
|----------|------|-------|
| Provider cost | ~60% | Actual API cost (varies per model) |
| Developer share | 20% | Fixed — can adjust per app tier |
| Gateway margin | ~20% | Platform profit |

## Developer Dashboard Data
- Total requests through their app
- Total tokens processed
- Total credits consumed
- Earnings this month
- Earnings to date
- Payout history

## Events Consumed
| Topic | Event Type | Action |
|-------|-----------|--------|
| `usage.events` | `usage.request.completed` | Calculate and add dev earning |
