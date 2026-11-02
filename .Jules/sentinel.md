## 2026-11-02 - Fix Timing Attack Vulnerability in codexRoutes
**Vulnerability:** Simple string equality comparison (`!==`) was used to validate the `x-internal-secret` header in `codexRoutes.ts`.
**Learning:** This exposes the endpoint to timing attacks, allowing an attacker to incrementally guess the secret by measuring response times.
**Prevention:** Always use `timingSafeEqual` from the `crypto` module when comparing sensitive tokens, secrets, or passwords, ensuring both inputs are cast to `Buffer` and checked for equal length beforehand.
