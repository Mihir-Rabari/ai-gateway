## 2026-10-22 - Fix Timing Attack Vulnerability in Codex Routes
**Vulnerability:** A standard string equality check (`clientSecret !== internalSecret`) was used to verify internal API secrets in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** This approach leaves the service vulnerable to timing attacks where attackers can guess the secret by observing the time taken to reject an invalid secret.
**Prevention:** Always use `timingSafeEqual` from the `crypto` library to compare sensitive tokens or passwords in Node.js, ensuring both inputs are cast to `Buffer` and have the same length.
