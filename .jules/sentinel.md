## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.
## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.

## 2024-05-18 - [postMessage Origin Validation]
**Vulnerability:** window.opener.postMessage was accepting any origin parameter passed via query params, which could lead to sensitive auth tokens being leaked to malicious opener origins. If `origin` param was missing, it defaulted to the insecure wildcard `*`.
**Learning:** Auth popups sending sensitive payloads (like JWTs) back to their parent window must explicitly validate the requested target origin against a known whitelist. The frontend must not blindly trust the `origin` query parameter provided by the opener.
**Prevention:** Always validate target origins for `postMessage` against `NEXT_PUBLIC_ALLOWED_ORIGINS` (or equivalent whitelist) and reject unapproved origins. Never use the wildcard `*` for sensitive data.
