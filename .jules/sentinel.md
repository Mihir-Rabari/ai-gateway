## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.

## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.

## 2024-07-02 - [Fix Information Leakage in API Route]
**Vulnerability:** The `/chat` API route in `apps/api/src/routes/v1/chat.ts` returned `err.message` directly in a 500 error response.
**Learning:** Returning raw internal error messages (`err.message` or stack traces) can expose sensitive internal application logic, configurations, or system state to end-users and potential attackers. Error handling blocks must sanitize outputs.
**Prevention:** Always log detailed errors internally (e.g., using `fastify.log.error`) and return sanitized, generic error messages (e.g., "Internal server error") in HTTP responses for 5xx server errors.
