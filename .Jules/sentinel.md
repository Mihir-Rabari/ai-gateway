## 2024-10-24 - Fix Timing Attack in Codex Routes
**Vulnerability:** Timing attack vulnerability in internal service secret comparison in `apps/auth-service/src/routes/codexRoutes.ts`. It used string equality (`!==`) which leaks information through response time.
**Learning:** Even internal endpoints must use constant-time comparison for secrets. The pattern was fixed in some places but not all.
**Prevention:** Always use `crypto.timingSafeEqual` after casting to `Buffer` and checking for equal lengths for all security tokens/secrets comparison.
