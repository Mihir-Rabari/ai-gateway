
## 2026-10-28 - Fix Timing Attack in Codex Routes
**Vulnerability:** Simple string comparison (`!==`) used for internal service secret validation in `codexRoutes.ts`.
**Learning:** Checking string equality character by character exposes the comparison to timing attacks, allowing attackers to guess the secret based on response times.
**Prevention:** Use `crypto.timingSafeEqual` with `Buffer` for all sensitive secret, token, and password comparisons to ensure constant-time checking.
