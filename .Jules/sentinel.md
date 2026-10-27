## 2026-10-27 - Prevent timing attack in codexRoutes secret comparison
**Vulnerability:** Timing attack vulnerability in internal secret comparison.
**Learning:** The codexRoutes.ts file compared the internal secret using the !== operator instead of a constant-time comparison, making it susceptible to timing attacks.
**Prevention:** Always use crypto.timingSafeEqual() for comparing sensitive tokens, secrets, or passwords, ensuring inputs are Buffer objects of equal length.
