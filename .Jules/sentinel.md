## 2026-10-19 - Fix Timing Attack in Codex Routes
**Vulnerability:** The internal secret comparison in Codex routes (`clientSecret !== internalSecret`) was using simple string equality instead of a constant-time comparison, making it susceptible to timing attacks where an attacker could deduce the secret by observing the response time.
**Learning:** Comparing sensitive secrets or tokens with `===` or `!==` creates a side channel because the operation fails faster on the first mismatched character.
**Prevention:** Always use `crypto.timingSafeEqual()` to compare sensitive internal tokens, client secrets, and passwords, making sure they are cast to `Buffer` and verified to be the same length first.
