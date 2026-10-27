## 2026-10-27 - Timing Attack Vulnerability
**Vulnerability:** Timing attack vulnerability due to simple equality comparison (`!==`) for internal service secrets in `codexRoutes.ts`.
**Learning:** Using standard equality operators for sensitive strings allows attackers to measure the time taken to process comparisons and infer the characters of the secret.
**Prevention:** Always use `crypto.timingSafeEqual` with valid buffers of equal length when comparing sensitive tokens, secrets, or passwords.
