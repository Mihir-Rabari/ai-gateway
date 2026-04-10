## 2026-04-05 - Added security headers to API service
**Vulnerability:** The API service lacked standard security HTTP headers (e.g., Content-Security-Policy, X-Frame-Options), leaving it vulnerable to basic attacks like XSS or clickjacking.
**Learning:** Fastify allows easy addition of security headers without introducing new dependencies by using the `onSend` lifecycle hook on the app instance. This pattern was already present in the gateway service but missing in the core API service.
**Prevention:** Ensure new Fastify services implement the standard security headers in an `onSend` hook during bootstrapping to provide defense-in-depth from the start.
