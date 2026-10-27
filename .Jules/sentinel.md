## 2026-10-27 - Timing Attack in Codex Routes
**Vulnerability:** A simple string comparison (`!==`) was used to compare internal secrets in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** String comparison fails early on mismatched characters, which can allow an attacker to guess secrets byte-by-byte by observing response times (timing attack).
**Prevention:** Always use `crypto.timingSafeEqual` with Buffer casting to compare sensitive tokens or secrets.
