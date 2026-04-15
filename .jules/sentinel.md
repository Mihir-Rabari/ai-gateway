## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.

## 2024-05-24 - Information Exposure in Error Handling
**Vulnerability:** Raw error messages and stack traces were leaked to the client during unexpected server errors (500) in the `/chat` endpoint.
**Learning:** Returning `err.message` directly in HTTP responses can expose internal system details, potentially revealing sensitive architectural or codebase information to attackers.
**Prevention:** In backend Fastify routes, never return raw error messages or stack traces on 500 errors. Instead, log the detailed error internally using structured logging (e.g., `fastify.log.error`) and return a sanitized, generic 'Internal server error' message.
