## 2026-10-25 - Fix Timing Attack Vulnerability in Codex Routes
**Vulnerability:** A simple string comparison (`!==`) was used to check the internal service secret in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** This exposes the application to timing attacks where an attacker could deduce the secret by observing the time taken to process the request.
**Prevention:** Always use `timingSafeEqual` from the `crypto` module when comparing sensitive tokens, client secrets, or passwords.
