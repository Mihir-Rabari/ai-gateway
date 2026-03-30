# Routing Module

## Purpose
Select the best AI model provider for each request, call the provider, handle failures and fallbacks.

## Responsibilities
- Maintain a registry of AI providers and their models
- Select optimal provider based on model requested, cost, and health
- Normalize request/response format across providers (OpenAI-compatible)
- Handle provider failures and automatic fallback
- Track provider health and latency

## Provider Registry
```typescript
const providers = {
  openai: {
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    baseUrl: 'https://api.openai.com/v1',
    creditsPerThousandTokens: { 'gpt-4o': 10, 'gpt-3.5-turbo': 1 },
  },
  anthropic: {
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    baseUrl: 'https://api.anthropic.com/v1',
    creditsPerThousandTokens: { 'claude-3-5-sonnet': 12, 'claude-3-haiku': 2 },
  },
  google: {
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    creditsPerThousandTokens: { 'gemini-1.5-pro': 8, 'gemini-1.5-flash': 1 },
  },
};
```

## Routing Logic
```
1. Receive model name from gateway
2. Look up which provider supports this model
3. Check provider health (Redis cache, 30s TTL)
4. If healthy → call provider
5. If unhealthy → try fallback model (defined in fallback map)
6. If all fail → return GATEWAY_002 error
```

## Fallback Map
```typescript
const fallbackMap: Record<string, string> = {
  'gpt-4o': 'gpt-3.5-turbo',
  'claude-3-5-sonnet': 'claude-3-haiku',
  'gemini-1.5-pro': 'gemini-1.5-flash',
};
```

## Request Normalization
All providers receive OpenAI-compatible format:
```typescript
{
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>;
  max_tokens?: number;
  temperature?: number;
}
```

Anthropic and Google requests are transformed internally to their native formats.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/internal/routing/route` | Internal | Route and execute request |
| GET | `/internal/routing/providers` | Internal | List provider health |
| GET | `/internal/routing/cost` | Internal | Calculate cost for request |

## Events Published
| Topic | Event Type | When |
|-------|-----------|------|
| `routing.events` | `routing.selected` | Provider selected |
| `routing.events` | `routing.fallback` | Fallback triggered |

## Provider Health (Redis)
```
Key:   provider_health:<provider>
Value: { healthy: bool, latencyMs: number, lastChecked: ISO }
TTL:   30 seconds
```
