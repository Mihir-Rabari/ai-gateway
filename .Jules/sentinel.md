## 2026-10-27 - Timing Attack in Secret Comparison
**Vulnerability:** Simple string comparison (`clientSecret !== internalSecret`) used for validating the internal service secret in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** Comparing sensitive tokens using simple equality operators can expose the application to timing attacks, as they return early on the first non-matching character, allowing attackers to guess the secret character by character.
**Prevention:** Always use `crypto.timingSafeEqual()` for comparing sensitive strings, converting them to `Buffer` and checking for equal length beforehand.
