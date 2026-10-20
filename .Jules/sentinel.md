## 2026-10-20 - Fix Timing Attack in Codex Auth
**Vulnerability:** String comparison operators (`===` or `!==`) used for matching the internal service secret in the Codex authentication flow (`apps/auth-service/src/routes/codexRoutes.ts`).
**Learning:** Comparing secrets with simple string comparison exposes a system to timing-based side-channel attacks, because string equality checks short-circuit on the first mismatched character. An attacker could potentially discover the internal secret byte-by-byte by carefully measuring response times.
**Prevention:** Use `crypto.timingSafeEqual()` alongside enforcing identical buffer lengths when comparing secrets to ensure constant-time execution independent of input values.
