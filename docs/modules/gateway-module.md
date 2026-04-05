# Gateway Module

## Purpose
The gateway is the brain. Every AI request flows through here. It validates, checks, routes, and responds.

## Request Flow (The Critical Path)

```
External App → POST /gateway/request
     │
     ├─ 1. Validate API key (is this a registered app?)
     ├─ 2. Validate user token (auth-service)
     ├─ 3. Check credit balance (credit-service)
     ├─ 4. Lock credits (credit-service) — atomic reservation
     │
     ├─ 5. Route request to model (routing-service)
     │       └─ routing-service calls AI provider
     │
     ├─ 6. Receive response from model
     ├─ 7. Confirm credit deduction (credit-service)
     ├─ 8. Publish usage.events (Kafka)
     ├─ 9. Publish analytics.events (Kafka)
     │
     └─ 10. Return response to app

On failure at step 5-6:
     └─ Release credit lock → Return error
```

## Gateway Request Schema
```typescript
interface GatewayRequest {
  model: string;            // 'gpt-4o' | 'claude-3-5-sonnet' | etc.
  messages: Message[];      // OpenAI-compatible message format
  userToken: string;        // User's access token
  appId: string;            // Registered app ID
  metadata?: {
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
  };
}

interface GatewayResponse {
  requestId: string;
  output: string;
  tokensUsed: number;
  creditsDeducted: number;
  model: string;
  provider: string;
  latencyMs: number;
}
```

## Service Calls Made by Gateway
```
auth-service    → validate user token
credit-service  → check, lock, confirm/release credits
routing-service → select provider + call AI model
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/gateway/request` | App API key + User token | Process AI request |
| GET | `/gateway/models` | App API key | List available models |
| GET | `/gateway/health` | None | Health check |

## Events Published
| Topic | Event Type | When |
|-------|-----------|------|
| `usage.events` | `usage.request.completed` | Successful request |
| `usage.events` | `usage.request.failed` | Failed request |
| `analytics.events` | Request metadata | Every request |

## Error Handling
| Error | Code | Action |
|-------|------|--------|
| Invalid API key | `GATEWAY_000` | 401 immediately |
| Invalid user token | `AUTH_001` | 401 immediately |
| Expired token | `AUTH_002` | 401, client should refresh |
| Insufficient credits | `CREDIT_001` | 402, prompt upgrade |
| Credit lock failed | `CREDIT_002` | 503, retry |
| Model provider error | `GATEWAY_001` | 502, try fallback |
| Routing failed | `GATEWAY_002` | 503 |

## Rate Limiting
- Per user: 60 requests/minute
- Per app: 1000 requests/minute
- Rate limits stored in Redis with sliding window
## Current Runtime Notes

- Runtime auth currently depends on a user bearer token plus the `x-app-id` header
- The gateway exposes `GET /gateway/status` in addition to `POST /gateway/request` and `GET /gateway/models`
- Usage events are published; the separate `analytics.events` topic described above is not currently implemented
## Current Runtime Notes

- Runtime auth currently depends on a user bearer token plus the `x-app-id` header
- The gateway exposes `GET /gateway/status` in addition to `POST /gateway/request` and `GET /gateway/models`
- Usage events are published; the separate `analytics.events` topic described above is not currently implemented
