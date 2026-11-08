## 2026-11-01 - Fix timing attack vulnerability in secret comparison
**Vulnerability:** Simple string comparison (`!==`) was used for sensitive internal secret validation in `codexRoutes.ts`, allowing potential timing attacks.
**Learning:** Node.js applications must use `crypto.timingSafeEqual()` with `Buffer` objects of equal length when comparing sensitive tokens to prevent execution time variations that expose the secret length or content.
**Prevention:** Ensure both strings are cast to `Buffer` and compared securely using `timingSafeEqual()` in authentication pathways.

## 2026-11-08 - Fix Hardcoded Database Credentials
**Vulnerability:** Found hardcoded database credentials ('gateway_user:gateway_pass') as fallback connection strings in apps/api/src/routes/v1/apps.ts and developers.ts.
**Learning:** Even fallback values can leak sensitive credentials if they match local dev or test environments, creating a risk if committed.
**Prevention:** Rely on process.env without providing hardcoded default credential strings.
