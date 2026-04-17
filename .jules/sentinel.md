## 2024-06-25 - [Fix JWT Expiration Check]
**Vulnerability:** The JWT expiration check in `packages/utils/src/index.ts` within the `verifyAppJwt` function was commented out. This meant that any App JWT, even if expired, would be accepted as valid.
**Learning:** This is a critical security vulnerability as it allows for the replay or reuse of potentially compromised tokens indefinitely. The check was likely commented out during debugging and accidentally left out of the final code.
**Prevention:** Always ensure that JWTs are validated for expiration (`exp` claim) and that such crucial security checks are not commented out or bypassed in production code. Tests should be implemented to verify that expired tokens are explicitly rejected.

## 2024-04-14 - [Add Security Headers Plugin]
**Vulnerability:** The application was missing standard HTTP security headers (like Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, etc.), making it potentially vulnerable to Clickjacking, XSS, and MIME-sniffing attacks.
**Learning:** To maintain a minimal dependency footprint, it is possible and effective to implement a custom Fastify plugin (`securityHeadersPlugin`) using the `onSend` hook to manually inject these headers, rather than relying on external packages like `@fastify/helmet`.
**Prevention:** Always ensure standard security headers are applied uniformly across all web and API services by default, preferably through a centralized middleware or plugin.

## 2024-03-31 - Webhook Signature Validation Enhancements
**Vulnerability:** The Razorpay webhook signature verification in `billing-service` was vulnerable to two issues:
1. It used `JSON.stringify(req.body)` to reconstruct the payload, which could lead to signature mismatches if formatting differences exist between the raw payload and reconstructed payload. It also opens up potential bypasses.
2. It used standard string comparison `!==` for signature verification, making it vulnerable to timing attacks where an attacker could theoretically guess the signature character-by-character based on response time differences.
**Learning:** Raw request bodies must be captured for reliable and secure signature validation. A custom content parser is an effective way to extract the raw body in Fastify. Furthermore, cryptographic comparisons must always use constant-time operations like `crypto.timingSafeEqual`.
**Prevention:**
1. Always parse and capture raw body for webhook verification (`req.rawBody`).
2. Always use `crypto.timingSafeEqual` for comparing HMACs, signatures, or any security tokens, ensuring the inputs are properly converted to Buffers of equal length before comparison.

## $(date +%Y-%m-%d) - Prevent Information Leakage via console logs
**Vulnerability:** Multiple Fastify API routes (`apps.ts`, `chat.ts`) were directly using `console.log` and `console.error` to trace and dump errors. Direct use of `console.error` for errors could lead to sensitive trace information and potentially internal app structure or secrets being logged to a system console insecurely, or captured by a logging aggregation that expects structured data.
**Learning:** Directly using console methods bypasses the application's central structured logger. This makes log redaction hard and increases the risk of info leakage via stack traces. Pino (wrapped by `createLogger`) correctly formats, sanitizes, and prevents circular reference issues.
**Prevention:** Remove raw `console.*` statements and exclusively use the framework/service initialized logger (`fastify.log.error` or `logger.error`).
