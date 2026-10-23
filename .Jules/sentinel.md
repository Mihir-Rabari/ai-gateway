## 2026-10-23 - Fix timing attack on internal secret comparison in codexRoutes
**Vulnerability:** Comparing sensitive internal service secrets using the non-constant-time !== operator, which is vulnerable to timing attacks.
**Learning:** The codexRoutes file introduced a new internal auth endpoint but didn't copy the timingSafeEqual pattern established in internalRoutes.ts.
**Prevention:** Always use crypto.timingSafeEqual with Buffer inputs for comparing passwords, tokens, or secrets.
