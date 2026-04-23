## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.
## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.
## 2024-06-25 - [Fix Information Leakage in API Routes]
**Vulnerability:** The API gateway route `apps/api/src/routes/v1/chat.ts` returned raw unhandled error messages (`err.message`) inside HTTP 500 responses.
**Learning:** Returning raw error messages instead of generic, sanitized responses could expose internal sensitive server details (such as stack traces, database schema details, file paths, etc.) to an external attacker. This breaks the "Fail securely" principle.
**Prevention:** Always mask unhandled 500 error responses with generic messages, such as "Internal server error" or "Unexpected server error". The actual underlying error details should be captured internally using a structured logger.
