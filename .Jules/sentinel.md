## 2026-10-30 - Timing Attack Vulnerability in Codex Routes
**Vulnerability:** The internal service secret verification in `apps/auth-service/src/routes/codexRoutes.ts` used standard string equality (`clientSecret !== internalSecret`), which is vulnerable to timing attacks.
**Learning:** Even internal endpoints must use `crypto.timingSafeEqual` when comparing sensitive secrets or tokens to prevent attackers from guessing the secret character by character based on response times.
**Prevention:** Always cast both inputs to `Buffer`, check for equal lengths, and use `timingSafeEqual` for all secret comparisons in Node.js applications.
