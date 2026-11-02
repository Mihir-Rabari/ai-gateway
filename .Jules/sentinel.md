## 2026-11-02 - [Prevent Timing Attacks in Internal Secret Comparisons]
**Vulnerability:** A simple string equality operator (`!==`) was used to compare the internal service secret in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** This could allow a timing attack to incrementally guess the secret because the simple equality operator exits early upon finding a mismatch. Other services correctly used `timingSafeEqual`, but it was missed in this specific endpoint.
**Prevention:** Always use `crypto.timingSafeEqual()` when comparing sensitive tokens, client secrets, passwords, or internal API keys. Cast inputs to `Buffer` and ensure they are of equal length before comparison.
