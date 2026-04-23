## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.
## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.
## 2024-05-20 - [Secure postMessage Origin Validation]
**Vulnerability:** The application was using an unvalidated query parameter (`origin`) or a wildcard (`*`) as the target origin for `window.opener.postMessage` in the authentication popup (`apps/web/src/app/auth/popup/page.tsx`). This could allow a malicious site to open the popup, provide its own origin, and steal the generated `accessToken` and user data.
**Learning:** `postMessage` cross-origin communication must always explicitly validate the target origin against a trusted whitelist. Relying on user-provided input without validation for the target origin leads to severe data leakage vulnerabilities.
**Prevention:** Always parse and validate `origin` parameters against environment-defined allowed origins (e.g., `NEXT_PUBLIC_ALLOWED_ORIGINS`) before passing them to `postMessage`. Never use `*` when transmitting sensitive data.
