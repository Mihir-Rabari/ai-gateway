
## 2026-10-29 - [Timing Attack in string comparison]
**Vulnerability:** A standard string equality comparison (`!==`) was used to verify the internal service secret in `apps/auth-service/src/routes/codexRoutes.ts`.
**Learning:** Comparing sensitive secrets/tokens with regular equality operators introduces timing attack vulnerabilities, where an attacker can figure out the secret bit-by-bit by measuring the time taken for the comparison to fail.
**Prevention:** Always use `crypto.timingSafeEqual()` for comparing sensitive tokens or secrets. Convert strings to `Buffer` and ensure they are of the same length before comparison to avoid errors.
