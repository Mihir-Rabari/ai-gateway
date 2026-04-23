## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.
## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.
## 2024-06-25 - [Fix Information Leakage in Error Handling]
**Vulnerability:** The global Fastify error handler and the chat route catch block were exposing raw error messages (`err.message`) to the client on 5xx Internal Server Errors. This leaked potentially sensitive internal stack traces or database error messages.
**Learning:** Returning unhandled exception details directly in HTTP responses is a common Information Leakage vector. Global error handlers and route-level catches must sanitize the output presented to the caller while ensuring detailed logging is kept internal.
**Prevention:** Always log the detailed error internally using request-scoped structured logging (e.g., `req.log.error`) and return a sanitized, generic 'Internal server error' message for any HTTP status code >= 500.
