## 2026-10-26 - Prevent Timing Attacks in codexRoutes

**Vulnerability:** A simple string equality operator (`!==`) was used to compare the provided `x-internal-secret` with the `INTERNAL_SERVICE_SECRET`, making the endpoint vulnerable to timing attacks.
**Learning:** Even internal endpoints must use constant-time comparison for secrets to prevent unauthorized access via side channels.
**Prevention:** Always use `crypto.timingSafeEqual` and convert secrets to buffers before comparing them.
