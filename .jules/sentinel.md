## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.
## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.
## 2024-05-18 - Prevent Error Details Information Leakage
**Vulnerability:** Fastify route catch-all handlers were logging full error details globally using `console.log`/`console.error` and sending raw `err.message` in 5xx JSON responses.
**Learning:** Returning unhandled error properties (like `err.message` or stack traces) directly to the client exposes internal architectural and state information, creating an information leakage vulnerability. Additionally, global `console` logs do not easily tie errors back to a specific HTTP request, complicating auditing.
**Prevention:** Always sanitize 5xx error responses with generic messages (e.g., 'Unexpected server error') before sending to the client. Use request-scoped structured logging (`req.log.info`, `req.log.error`) to log the detailed, raw error object internally, ensuring that logs are tied to request contexts securely.
## 2024-05-18 - [Fix insecure target origin for window.opener.postMessage in web app popup]
**Vulnerability:** The web authentication popup passed sensitive tokens back to its opener using `window.opener.postMessage(..., '*')` or relied solely on a user-provided `origin` query parameter without server-side/build-time validation, which is vulnerable to cross-origin data leakage if an attacker opens the popup from a malicious origin.
**Learning:** `postMessage` calls must always explicitly specify the intended target origin, and relying solely on query parameters for security guarantees is flawed unless strictly validated against a known whitelist.
**Prevention:** Always restrict `targetOrigin` to trusted domains defined via environment variables (`NEXT_PUBLIC_ALLOWED_ORIGINS`). Ensure strict validation before transmission.
## 2024-06-25 - [Fix Overly Permissive CORS Configuration]
**Vulnerability:** Fastify route handlers were manually setting `Access-Control-Allow-Origin: *`, bypassing standard centralized hooks and creating a significant Cross-Origin Resource Sharing (CORS) vulnerability.
**Learning:** Manual CORS header overrides in individual route handlers override global, secure configurations and often result in insecure wildcards. CORS should ALWAYS be enforced via the globally registered `@fastify/cors` plugin.
**Prevention:** Never manually set `Access-Control-Allow-Origin` or other CORS headers in Fastify route handlers using `reply.raw.setHeader`.
