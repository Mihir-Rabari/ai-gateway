## 2026-10-20 - Timing Attack Vulnerability in Secret Comparison
**Vulnerability:** Simple string comparison (`===` or `!==`) was used to check internal service secrets (e.g., `clientSecret !== internalSecret` in `codexRoutes.ts`), instead of constant-time comparison.
**Learning:** Standard string comparisons stop at the first differing character, leaking the length of the matching prefix through timing differences. This allows an attacker to slowly brute-force the secret character by character by measuring response times.
**Prevention:** Always use `crypto.timingSafeEqual()` for comparing sensitive tokens, secrets, or hashes. Ensure both inputs are cast to `Buffer` and their lengths are checked prior to comparison.
