## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.

## 2026-04-17 - [Add strict security headers to mitigate XSS]
**Vulnerability:** Missing `Content-Security-Policy` and `X-XSS-Protection` headers on the `auth-service` authorize endpoints, which return raw HTML (login and error pages).
**Learning:** Returning HTML responses without strict CSP exposes the service to Cross-Site Scripting (XSS) if user input (e.g., error messages) is improperly sanitized or if new injection vectors are introduced. Even with rudimentary HTML escaping, defense-in-depth requires browser-level protections.
**Prevention:** Centralize security headers into a shared plugin (e.g., `securityHeadersPlugin` in `@ai-gateway/utils`) and enforce them globally across all services. For services rendering UI, strictly configure CSP (e.g., `default-src 'none'; style-src 'self' 'unsafe-inline'`) to balance security with visual requirements.
