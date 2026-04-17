## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.
## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.
## 2025-04-17 - [Prevent Information Leakage in 5xx Error Responses]
**Vulnerability:** Fastify route catch blocks and the shared error handler (`packages/utils/src/plugins/errorHandler.ts`) were returning raw error messages (`err.message`) to the client on 500 errors.
**Learning:** Sending raw `err.message` on a 500 can easily leak sensitive backend information (like stack traces, database credentials, internal service failures, and architectural insights) if validation or expected exceptions aren't formatted cleanly.
**Prevention:** Never leak raw error messages or stack traces on 5xx errors. Always log the error details server-side (`fastify.log.error` or `console.error`) and return a generic 'Internal server error' or 'Unexpected server error' string to the client.
