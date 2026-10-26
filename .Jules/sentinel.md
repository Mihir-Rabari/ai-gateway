## 2024-10-26 - Timing Attack Vulnerability in Secret Comparison
**Vulnerability:** A simple string equality check (`clientSecret !== internalSecret`) was used to verify internal service secrets in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** Comparing sensitive secrets or tokens using `===` or `!==` exposes the application to timing attacks, as these operators fail fast on the first mismatched character.
**Prevention:** Always cast secrets to `Buffer` and use `crypto.timingSafeEqual()` for constant-time comparison when verifying internal service secrets, API keys, or webhooks.
## 2026-10-26 - Timing Attack Vulnerability in Secret Comparison
**Vulnerability:** A simple string equality check (`clientSecret !== internalSecret`) was used to verify internal service secrets in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** Comparing sensitive secrets or tokens using `===` or `!==` exposes the application to timing attacks, as these operators fail fast on the first mismatched character.
**Prevention:** Always cast secrets to `Buffer` and use `crypto.timingSafeEqual()` for constant-time comparison when verifying internal service secrets, API keys, or webhooks.
