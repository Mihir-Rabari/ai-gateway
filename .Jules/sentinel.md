## 2026-10-29 - Fix Timing Attack in codexRoutes
**Vulnerability:** Simple string equality (`!==`) was used to compare internal secrets.
**Learning:** Using simple equality operators for sensitive strings like tokens, passwords, and secrets exposes the application to timing attacks.
**Prevention:** Use `crypto.timingSafeEqual()` with buffered strings of equal length to perform constant-time comparisons.
