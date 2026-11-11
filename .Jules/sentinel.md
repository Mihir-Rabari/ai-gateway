## 2026-11-01 - Fix timing attack vulnerability in secret comparison
**Vulnerability:** Simple string comparison (`!==`) was used for sensitive internal secret validation in `codexRoutes.ts`, allowing potential timing attacks.
**Learning:** Node.js applications must use `crypto.timingSafeEqual()` with `Buffer` objects of equal length when comparing sensitive tokens to prevent execution time variations that expose the secret length or content.
**Prevention:** Ensure both strings are cast to `Buffer` and compared securely using `timingSafeEqual()` in authentication pathways.

## 2026-11-11 - Remove hardcoded database credentials
**Vulnerability:** Hardcoded database credentials (gateway_user:gateway_pass) were used as fallbacks for DATABASE_URL.
**Learning:** Relying on hardcoded credentials as a fallback exposes sensitive information if committed to the codebase and creates a false sense of security.
**Prevention:** Always use environment variables for secrets and enforce their presence (or use secure default placeholders for dev/test environments without real passwords).
