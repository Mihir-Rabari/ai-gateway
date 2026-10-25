## 2026-10-25 - Prevent Timing Attack in Codex Routes
**Vulnerability:** The internal service secret in `apps/auth-service/src/routes/codexRoutes.ts` was being compared using strict equality operator (`!==`), which is susceptible to timing attacks.
**Learning:** Hardcoded simple string comparison for sensitive tokens exposes applications to timing vulnerabilities where attackers can determine secrets based on response times.
**Prevention:** Always use `crypto.timingSafeEqual()` to compare sensitive strings. Ensure both inputs are cast to `Buffer` and their lengths are compared first.
