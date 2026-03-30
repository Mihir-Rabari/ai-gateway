# Agent 6 — Billing Service

**Owner:** Agent 6
**Scope:** `apps/billing-service/`
**Must NOT touch:** Other services, shared packages (read only)

---

## Your Mission

Build reliable subscription billing via Razorpay. This is how AI Gateway makes money. Webhooks must be verified cryptographically — never trust unverified webhook payloads. Idempotency is critical — never double-charge or double-credit.

---

## Current State

- ✅ GET /billing/plans
- ✅ POST /billing/subscribe (creates Razorpay subscription)
- ✅ POST /billing/webhooks/razorpay (basic handler)
- ❌ Webhook signature verification may have issues
- ❌ Not all webhook event types handled
- ❌ No subscription status endpoint
- ❌ No cancellation endpoint
- ❌ No webhook idempotency

---

## Tasks

### Task 1 — Fix Webhook Signature Verification

The current implementation must strictly verify the Razorpay HMAC signature:

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyRazorpayWebhook(body: string, signature: string, secret: string): boolean {
  const expectedSig = createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  // Use timing-safe comparison to prevent timing attacks
  const expected = Buffer.from(expectedSig);
  const actual = Buffer.from(signature);
  
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
```

**Problem:** To verify a Razorpay webhook, you need the **raw request body** (bytes before JSON parsing). Configure Fastify to expose raw body:

```typescript
// In index.ts, before registering routes:
await app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    const json = JSON.parse(body.toString());
    (req as any).rawBody = body.toString();
    done(null, json);
  } catch (err) {
    done(err as Error, undefined);
  }
});
```

Then in the webhook handler, access `req.rawBody` for signature verification.

### Task 2 — Handle All Subscription Events

```typescript
const EVENT_HANDLERS: Record<string, (payload: RazorpayPayload) => Promise<void>> = {
  'subscription.activated': handleActivated,
  'subscription.charged': handleCharged,
  'subscription.cancelled': handleCancelled,
  'subscription.completed': handleCompleted,
  'payment.failed': handlePaymentFailed,
};

async function handleActivated(payload) {
  // Upgrade user plan + add monthly credits
}

async function handleCharged(payload) {
  // Add monthly credits (renewal)
}

async function handleCancelled(payload) {
  // Downgrade to free plan at end of billing period
  // Do NOT remove credits immediately
}

async function handlePaymentFailed(payload) {
  // Publish billing.payment.failed event to Kafka
  // Worker will handle sending email notification
}
```

### Task 3 — Webhook Idempotency

Store processed Razorpay event IDs in Redis to prevent double-processing:

```typescript
async function isEventProcessed(eventId: string): Promise<boolean> {
  const key = `webhook:processed:${eventId}`;
  const result = await redis.get(key);
  return result !== null;
}

async function markEventProcessed(eventId: string): Promise<void> {
  // Keep for 24 hours
  await redis.setex(`webhook:processed:${eventId}`, 86400, '1');
}
```

### Task 4 — GET /billing/subscription?userId=

```typescript
fastify.get('/subscription', async (req, reply) => {
  const { userId } = req.query as { userId: string };
  const result = await db.query(
    `SELECT plan_id, status, razorpay_subscription_id, updated_at
     FROM subscriptions WHERE user_id = $1`,
    [userId]
  );
  return reply.send(ok(result.rows[0] ?? { plan_id: 'free', status: 'none' }));
});
```

### Task 5 — POST /billing/cancel

```typescript
fastify.post('/cancel', async (req, reply) => {
  const { userId } = req.body as { userId: string };
  const result = await db.query(
    'SELECT razorpay_subscription_id FROM subscriptions WHERE user_id = $1 AND status = $2',
    [userId, 'active']
  );
  
  const sub = result.rows[0];
  if (!sub) return reply.status(404).send(fail(Errors.NOT_FOUND('Subscription')));
  
  // Cancel on Razorpay (cancel at end of billing cycle)
  await razorpay.subscriptions.cancel(sub.razorpay_subscription_id, { cancel_at_cycle_end: 1 });
  
  await db.query(
    'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE user_id = $2',
    ['cancelled', userId]
  );
  
  return reply.send(ok({ cancelled: true, effectiveAt: 'end-of-billing-cycle' }));
});
```

### Task 6 — Unit Tests

```typescript
describe('BillingService', () => {
  // Mock Razorpay SDK
  // Mock credit-service HTTP call
  // Test: webhook verification passes with correct signature
  // Test: webhook verification fails with wrong signature
  // Test: double webhook event is idempotent (processed only once)
  // Test: subscription.activated upgrades user plan
});
```

---

## Razorpay Plan IDs

When creating a Razorpay plan, you need to create plans in the Razorpay dashboard first.
For development:
```env
RAZORPAY_PLAN_ID_PRO=plan_test_xxx
RAZORPAY_PLAN_ID_MAX=plan_test_yyy
```

Add these to `.env.example`.

---

## Subscriptions Table Schema

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  plan_id VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',    -- pending, active, cancelled, expired
  razorpay_subscription_id VARCHAR(255) UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Env Vars

```env
BILLING_SERVICE_PORT=3004
DATABASE_URL=
REDIS_URL=
KAFKA_BROKERS=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CREDIT_SERVICE_URL=http://localhost:3005
```
