## 2026-10-24 - Timing Attack Prevention in Codex Routes
**Vulnerability:** Simple string equality (`!==`) was used to compare the internal service secret in `apps/auth-service/src/routes/codexRoutes.ts`, making it susceptible to timing attacks.
**Learning:** Even internal endpoints that verify shared secrets need protection against timing attacks. Other internal routes had this protection, but `codexRoutes.ts` was missed.
**Prevention:** Always cast string secrets to `Buffer` objects, check that their lengths are equal and non-zero, and use `crypto.timingSafeEqual()` to compare them in constant time.
