
## 2026-10-21 - Fix timing attack vulnerability in Codex routes
**Vulnerability:** Found an insecure string comparison (e.g., `clientSecret !== internalSecret`) being used to verify the `x-internal-secret` header in `apps/auth-service/src/routes/codexRoutes.ts`. This exposed the endpoint to potential timing attacks where an attacker could deduce the secret byte-by-byte based on response times.
**Learning:** This existed because standard JavaScript equality operators (`===` or `!==`) return immediately upon finding the first mismatched character, creating a measurable timing difference.
**Prevention:** Always use `timingSafeEqual` from the `crypto` module when comparing secrets, API keys, or tokens. Ensure both values are converted to `Buffer` objects of matching lengths before comparison to prevent the function itself from throwing length mismatch errors.
