## 2026-11-01 - Fix timing attack vulnerability in secret comparison
**Vulnerability:** Simple string comparison (`!==`) was used for sensitive internal secret validation in `codexRoutes.ts`, allowing potential timing attacks.
**Learning:** Node.js applications must use `crypto.timingSafeEqual()` with `Buffer` objects of equal length when comparing sensitive tokens to prevent execution time variations that expose the secret length or content.
**Prevention:** Ensure both strings are cast to `Buffer` and compared securely using `timingSafeEqual()` in authentication pathways.
