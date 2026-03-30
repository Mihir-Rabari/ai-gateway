# Design Patterns

## Core Patterns Used

### 1. Service Layer Pattern
All business logic lives in the service layer.

```
Controller → Service → Repository
```

- **Controller**: Parse request, call service, format response
- **Service**: Business logic, orchestration, event publishing
- **Repository**: Raw DB queries, no logic

```typescript
// ✅ Correct
class AuthController {
  async login(req, reply) {
    const result = await this.authService.login(req.body);
    reply.send(result);
  }
}

// ❌ Wrong — business logic in controller
class AuthController {
  async login(req, reply) {
    const user = await db.query('SELECT * FROM users WHERE email = $1', [req.body.email]);
    const valid = bcrypt.compare(req.body.password, user.password);
    // ... more logic
  }
}
```

### 2. Repository Pattern
Isolates database access from business logic.

```typescript
// ✅ Correct
class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ?? null;
  }
}
```

### 3. Event-Driven Architecture (Kafka)
Services emit events for async work — they don't wait for downstream processing.

```typescript
// After creating user → emit event → other services react
await this.eventPublisher.publish('auth.events', {
  type: 'user.created',
  userId: user.id,
  timestamp: new Date().toISOString(),
});
// Don't await downstream processing — fire and forget
```

### 4. Plugin Pattern (Fastify)
Shared infrastructure (DB, Redis, Kafka) as Fastify plugins.

```typescript
// Register once, available everywhere
fastify.register(postgresPlugin);
fastify.register(redisPlugin);
fastify.register(kafkaPlugin);
```

### 5. Credit Lock Pattern (Redis)
Prevent double-spending with atomic Redis locks.

```
Check credits → Lock (SETNX) → Reserve → Process → Confirm/Release
```

## Anti-Patterns to Avoid

| Anti-Pattern | Solution |
|-------------|---------|
| Fat controllers | Move logic to service layer |
| Direct DB calls in routes | Use repository pattern |
| Synchronous event processing | Use Kafka async events |
| Hardcoded config | Use `@ai-gateway/config` |
| Global state mutation | Use immutable patterns |
| Circular service dependencies | Use events, not direct calls |
