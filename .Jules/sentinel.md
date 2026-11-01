## 2025-02-27 - [Fix timing attack vulnerability in Codex internal route]
**Vulnerability:** A timing attack vulnerability was found in `apps/auth-service/src/routes/codexRoutes.ts` when validating the internal service secret. It uses a simple string comparison (`clientSecret !== internalSecret`) instead of `crypto.timingSafeEqual()`.
**Learning:** Comparing secrets and passwords with `===` or `!==` exposes the application to timing attacks, as the comparison returns false early when characters mismatch, allowing an attacker to guess the secret character by character by measuring response times.
**Prevention:** Always use `crypto.timingSafeEqual()` with `Buffer` instances when comparing sensitive values like secrets or passwords in Node.js applications.
