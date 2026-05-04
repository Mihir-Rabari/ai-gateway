# Billing Module

## Purpose
Handle subscription plans, Razorpay payments, and credit allocation on subscription events.

## Responsibilities
- Manage plans (Free, Pro, Max)
- Create and manage Razorpay subscriptions
- Handle Razorpay webhooks (payment.captured, subscription.activated, etc.)
- Allocate/refresh credits on subscription creation and renewal
- Handle subscription lifecycle (upgrade, downgrade, cancel)

## Plans
| Plan | Monthly Credits | Price | Priority |
|------|---------------|-------|---------|
| Free | 100 | ₹0 | Low |
| Pro | 1,000 | ₹499/mo | Standard |
| Max | 5,000 | ₹1,499/mo | High |

## Subscription Lifecycle

### New Subscription
```
User selects plan → POST /billing/subscribe
  → Create Razorpay subscription
  → Store subscription in PostgreSQL
  → Return Razorpay checkout URL
  → User completes payment on Razorpay
  → Razorpay fires webhook: subscription.activated
  → Billing service receives webhook
  → Verify webhook signature
  → Update user plan in PostgreSQL
  → Call credit-service: add credits to user wallet
  → Emit billing.subscription.created event
```

### Monthly Renewal
```
Razorpay fires: subscription.charged
  → Verify signature
  → Call credit-service: add credits (refill to plan limit)
  → Update billing records
  → Emit billing.subscription.renewed event
```

### Cancellation
```
User cancels → POST /billing/cancel
  → Cancel Razorpay subscription
  → Set subscription status to 'cancelling' (active until period end)
  → Razorpay fires: subscription.cancelled
  → Update user plan to 'free'
  → Emit billing.subscription.cancelled event
```

## Razorpay Integration

### Webhook Verification
```typescript
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (expectedSignature !== req.headers['x-razorpay-signature']) {
  throw new Error('Invalid webhook signature');
}
```

## Data Models

### Subscriptions (PostgreSQL)
```sql
subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id TEXT NOT NULL,                    -- 'free' | 'pro' | 'max'
  status TEXT NOT NULL,                     -- 'active' | 'cancelled' | 'expired'
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/billing/plans` | None | List available plans |
| GET | `/billing/subscription` | Access token | Get current subscription |
| POST | `/billing/subscribe` | Access token | Start subscription |
| POST | `/billing/cancel` | Access token | Cancel subscription |
| POST | `/billing/webhooks/razorpay` | Webhook sig | Razorpay webhook receiver |

## Events Published
| Topic | Event Type | When |
|-------|-----------|------|
| `billing.events` | `billing.subscription.created` | New subscription |
| `billing.events` | `billing.subscription.renewed` | Monthly renewal |
| `billing.events` | `billing.subscription.cancelled` | Cancellation |
## Current Runtime Notes

- The public API layer enriches subscription/cancel requests with the authenticated `userId`
- Billing-service must map local plan names to real Razorpay plan IDs using:
  - `RAZORPAY_PLAN_ID_PRO`
  - `RAZORPAY_PLAN_ID_MAX`
- Subscription creation currently returns the Razorpay subscription ID for checkout flow wiring
## Current Runtime Notes

- The public API layer enriches subscription/cancel requests with the authenticated `userId`
- Billing-service must map local plan names to real Razorpay plan IDs using:
  - `RAZORPAY_PLAN_ID_PRO`
  - `RAZORPAY_PLAN_ID_MAX`
- Subscription creation currently returns the Razorpay subscription ID for checkout flow wiring
