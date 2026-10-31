## 2026-10-31 - Fix Timing Attack in Internal Secret
**Vulnerability:** Simple string comparison (`!==`) used for internal service secret validation in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** This exposes the application to timing attacks, allowing an attacker to deduce the internal secret character by character by measuring response times.
**Prevention:** Always use `crypto.timingSafeEqual()` to compare secrets, passwords, or tokens. Ensure inputs are converted to `Buffer` and have the same length before comparison.
