# Agent 5 — Routing Service

**Owner:** Agent 5
**Scope:** `apps/routing-service/`
**Must NOT touch:** Other services, shared packages (read only)

---

## Your Mission

You are the intelligence layer that decides which AI model gets the user's request. You must be fast, resilient, and handle provider failures gracefully. If OpenAI goes down, users shouldn't notice.

---

## Current State

- ✅ POST /internal/routing/route
- ✅ GET /internal/routing/providers
- ✅ OpenAI integration (chat completions)
- ✅ Anthropic integration (messages API)
- ✅ Automatic fallback on failure
- ❌ Google Gemini integration missing
- ❌ Provider health tracking missing (should use Redis)
- ❌ Streaming support missing
- ❌ Circuit breaker missing

---

## Tasks

### Task 1 — Google Gemini Integration

Install: `pnpm --filter @ai-gateway/routing-service add @google/generative-ai`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

private async callGemini(
  model: string,
  messages: Message[],
  maxTokens: number,
  temperature: number,
): Promise<RouteResult> {
  const genAI = new GoogleGenerativeAI(process.env['GOOGLE_AI_API_KEY'] ?? '');
  const geminiModel = genAI.getGenerativeModel({ model });

  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages
    .filter(m => m.role === 'system')
    .map(m => m.content)
    .join('\n');

  const response = await geminiModel.generateContent({
    contents,
    ...(systemInstruction ? { systemInstruction } : {}),
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  });

  const text = response.response.text();
  const usage = response.response.usageMetadata;

  return {
    output: text,
    tokensInput: usage?.promptTokenCount ?? 0,
    tokensOutput: usage?.candidatesTokenCount ?? 0,
    tokensTotal: usage?.totalTokenCount ?? 0,
    model,
    provider: 'google',
  };
}
```

Update `callProvider()` to handle `'google'` case.

### Task 2 — Provider Health Tracking (Redis)

Use Redis to mark providers as unhealthy for 60 seconds after failure:

```typescript
private async markUnhealthy(provider: ProviderName): Promise<void> {
  await this.redis.setex(`provider:unhealthy:${provider}`, 60, '1');
}

private async isHealthy(provider: ProviderName): Promise<boolean> {
  const result = await this.redis.get(`provider:unhealthy:${provider}`);
  return result === null;
}
```

Before routing, check health. If primary is unhealthy, skip directly to fallback.

The routing service needs a Redis plugin. Create `apps/routing-service/src/plugins/redis.ts`.

### Task 3 — Circuit Breaker

Track consecutive failures per provider in Redis:

```typescript
const FAILURE_THRESHOLD = 5;

private async recordFailure(provider: ProviderName): Promise<void> {
  const key = `provider:failures:${provider}`;
  const failures = await this.redis.incr(key);
  await this.redis.expire(key, 300); // reset after 5 minutes
  if (failures >= FAILURE_THRESHOLD) {
    await this.markUnhealthy(provider);
    logger.warn({ provider, failures }, 'Provider circuit breaker tripped');
  }
}

private async recordSuccess(provider: ProviderName): Promise<void> {
  await this.redis.del(`provider:failures:${provider}`);
}
```

### Task 4 — Streaming Support

For the route endpoint, add streaming capability:

```typescript
// POST /internal/routing/route with streaming: true
// Uses Server-Sent Events (or chunked transfer)
// Each chunk: `data: {"chunk": "...", "done": false}\n\n`
// Final: `data: {"chunk": "", "done": true, "tokens": {...}}\n\n`
```

This is a Phase 2+ feature but stub out the interface now.

### Task 5 — Update Provider Health Endpoint

The `/internal/routing/providers` endpoint should return real health from Redis:

```typescript
const providers = await Promise.all(['openai', 'anthropic', 'google'].map(async (p) => ({
  name: p,
  models: MODELS_BY_PROVIDER[p],
  healthy: await this.isHealthy(p as ProviderName),
  failureCount: Number(await this.redis.get(`provider:failures:${p}`) ?? '0'),
})));
```

### Task 6 — Unit Tests

```typescript
describe('RoutingService', () => {
  // Mock OpenAI + Anthropic clients
  // Test: routes to correct provider for each model
  // Test: falls back to fallback model when primary fails
  // Test: throws ROUTING_FAILED when all options exhausted
  // Test: health check correctly reflects Redis state
});
```

---

## Provider → Model Map

```typescript
const MODEL_PROVIDER: Record<string, ProviderName> = {
  'gpt-4o': 'openai',
  'gpt-4-turbo': 'openai',
  'gpt-3.5-turbo': 'openai',
  'claude-3-5-sonnet-20241022': 'anthropic',
  'claude-3-haiku-20240307': 'anthropic',
  'gemini-1.5-pro': 'google',
  'gemini-1.5-flash': 'google',
};

const FALLBACK_MAP: Record<string, string> = {
  'gpt-4o': 'gpt-3.5-turbo',
  'gpt-4-turbo': 'gpt-3.5-turbo',
  'claude-3-5-sonnet-20241022': 'claude-3-haiku-20240307',
  'gemini-1.5-pro': 'gemini-1.5-flash',
};
```

---

## Env Vars

```env
ROUTING_SERVICE_PORT=3006
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
REDIS_URL=
KAFKA_BROKERS=
```

Note: Add `GOOGLE_AI_API_KEY` to `.env.example` if not already there.
