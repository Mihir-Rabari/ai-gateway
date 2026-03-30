# Auth Module

## Purpose
Handle identity and authentication across all AI Gateway apps. Acts as the "Login with AI Gateway" system — equivalent to Google Sign-In for this ecosystem.

## Responsibilities
- User signup and login (email/password)
- JWT access token + refresh token issuance
- Refresh token rotation and invalidation
- OAuth-style token exchange for third-party apps
- Session management via Redis
- Token validation for internal service-to-service calls

## Flow Diagrams

### Signup Flow
```
Client → POST /auth/signup
  → Validate input
  → Check if email exists (UserRepository)
  → Hash password (bcrypt)
  → Create user in PostgreSQL
  → Generate access + refresh tokens
  → Store refresh token in Redis (TTL: 7d)
  → Emit user.created event (Kafka)
  → Return { accessToken, refreshToken, user }
```

### Login Flow
```
Client → POST /auth/login
  → Validate credentials
  → Fetch user from PostgreSQL
  → Verify password hash
  → Generate access + refresh tokens
  → Store refresh token in Redis
  → Emit user.login event
  → Return { accessToken, refreshToken, user }
```

### Token Refresh Flow
```
Client → POST /auth/refresh { refreshToken }
  → Validate refresh token signature
  → Check refresh token exists in Redis
  → Delete old refresh token (rotation)
  → Issue new access + refresh tokens
  → Store new refresh token in Redis
  → Return { accessToken, refreshToken }
```

### Internal Token Validation (Gateway uses this)
```
Gateway → POST /internal/auth/validate { token }
  → Verify JWT signature
  → Check token not in Redis blacklist
  → Return { valid: true, userId, planId }
```

## Key Data Models

### User (PostgreSQL)
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  plan_id TEXT DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Session (Redis)
```
Key:   refresh:<userId>:<tokenId>
Value: { userId, planId, issuedAt }
TTL:   7 days
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | None | Create account |
| POST | `/auth/login` | None | Login |
| POST | `/auth/refresh` | Refresh token | Rotate tokens |
| POST | `/auth/logout` | Access token | Invalidate session |
| GET | `/auth/me` | Access token | Get current user |
| POST | `/internal/auth/validate` | Internal | Validate token (for gateway) |

## Events Published

| Topic | Event Type | When |
|-------|-----------|------|
| `auth.events` | `user.created` | After signup |
| `auth.events` | `user.login` | After login |
| `auth.events` | `user.logout` | After logout |

## Security
- Passwords hashed with bcrypt (cost factor 12)
- Access tokens: 15 minute expiry
- Refresh tokens: 7 day expiry with rotation
- Refresh tokens stored in Redis (can be revoked instantly)
- Rate limit: 10 auth attempts per IP per minute
