## 2026-10-30 - Fix Timing Attack in Codex Routes
**Vulnerability:** The internal secret verification in `apps/auth-service/src/routes/codexRoutes.ts` used a simple strict equality check (`clientSecret !== internalSecret`), which is vulnerable to timing attacks.
**Learning:** Inconsistent usage of `timingSafeEqual` in internal API secret validation paths exposes the system to timing attacks that could allow attackers to bypass authentication.
**Prevention:** Ensure that all comparisons involving sensitive data (such as API keys, tokens, or internal secrets) use `crypto.timingSafeEqual` with `Buffer`s of equal length, avoiding early-exit string comparisons.
