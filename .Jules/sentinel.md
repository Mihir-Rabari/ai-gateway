## 2026-10-26 - [Timing Attack in Auth Routing Validation]
**Vulnerability:** A simple string inequality check `clientSecret !== internalSecret` was used when comparing internal service secrets in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** Comparing secrets using normal equality operators allows timing attacks because it evaluates characters sequentially, stopping early at the first mismatch.
**Prevention:** Always use `crypto.timingSafeEqual()` with `Buffer` instances representing equal length arrays when verifying internal service secrets or sensitive tokens.
