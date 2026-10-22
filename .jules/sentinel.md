## 2026-10-22 - Fix timing attack vulnerability in auth service
**Vulnerability:** String comparison (!==) used for internal service secret token validation in apps/auth-service/src/routes/codexRoutes.ts.
**Learning:** Checking secure tokens with !== can allow attackers to perform a timing attack to guess tokens character by character.
**Prevention:** Always use `crypto.timingSafeEqual` when comparing secrets, passwords, or authentication tokens.
