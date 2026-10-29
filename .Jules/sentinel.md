## 2026-10-29 - Fix timing attack vulnerability in codexRoutes.ts
**Vulnerability:** The internal service secret comparison in `apps/auth-service/src/routes/codexRoutes.ts` used a standard string inequality check (`clientSecret !== internalSecret`), which is vulnerable to timing attacks.
**Learning:** Using simple equality operators for sensitive comparisons (like secrets, passwords, tokens) can allow an attacker to guess the string character by character by measuring the time the comparison takes.
**Prevention:** Always convert both strings to Buffers and verify they have the same length before comparing them using `crypto.timingSafeEqual()` to ensure constant-time comparison.
