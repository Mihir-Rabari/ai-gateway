## 2026-11-01 - [HIGH] Fix timing attack in codexRoutes
**Vulnerability:** String comparison used for internal secret authentication (`clientSecret !== internalSecret`), which is vulnerable to timing attacks.
**Learning:** Node.js V8 engine's string comparison exits early on the first non-matching character, allowing attackers to guess the secret character by character by measuring response times.
**Prevention:** Always cast secrets to `Buffer` and use `crypto.timingSafeEqual()` for constant-time comparison when verifying tokens, passwords, or internal API secrets.
