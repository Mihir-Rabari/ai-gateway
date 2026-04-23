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
## 2024-05-24 - Do not leak internal server details via 500 error messages

**Vulnerability:** Error responses originating from internal exceptions were leaking detailed properties (like the `message` string from arbitrary application errors) when responding with `500` status codes. This happened in `packages/utils/src/plugins/errorHandler.ts` and in custom error handling catch blocks (e.g. `apps/api/src/routes/v1/apps.ts`).
**Learning:** Returning unmasked error messages directly from the server on `5xx` errors gives attackers insights into the underlying stack, paths, framework versions, and database schemas. The Fastify error handler and some specific API routes were not sanitizing the `message` field when throwing server errors.
**Prevention:** Always mask `5xx` error messages before sending them to the client. Internally, log the original error (e.g. `req.log.error`) for debugging and monitoring purposes. Use generic response messages such as "Internal server error" for all unhandled backend exceptions.
