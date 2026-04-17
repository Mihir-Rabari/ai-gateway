## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.

## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.

## 2024-04-14 - Prevent Error Message and Log Leakage
**Vulnerability:** The `/chat` endpoint was leaking raw internal error messages (`err.message`) to the user in the event of a server error (HTTP 500) and was logging unstructured sensitive information to standard output using `console.log` and `console.error`.
**Learning:** Exposing raw error messages or stack traces can provide malicious actors with detailed insight into internal system architecture or state, aiding in further exploitation. Using unstructured `console.*` calls can lead to unformatted and difficult-to-manage logs that may inadvertently leak sensitive payload data or lack required context (like request IDs).
**Prevention:** Always log errors internally using structured logging (e.g., `fastify.log.error`) and return a sanitized, generic error message (e.g., 'Internal server error') to the client for unexpected server errors. Consistently utilize the application's structured logging framework instead of raw console output.
