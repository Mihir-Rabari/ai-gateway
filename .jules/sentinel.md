## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.
## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.
## 2026-04-22 - [Secure postMessage Target Origin Validation]
**Vulnerability:** In auth popups, `window.opener.postMessage` used the origin passed in the URL parameters and fell back to the insecure wildcard `*` if missing, allowing potentially malicious openers to receive sensitive access tokens if the origin was omitted or manipulated.
**Learning:** For secure cross-origin communication via `window.opener.postMessage` (e.g., in auth popups), explicitly validate the target origin against a strict whitelist of trusted domains and never use the insecure wildcard `*`.
**Prevention:** Always parse and validate the `origin` against a centralized whitelist of allowed domains (e.g., `NEXT_PUBLIC_ALLOWED_ORIGINS`) before sending sensitive data via `postMessage`. Discard the message or throw an error if the origin is invalid or missing.
