## 2024-06-25 - [Fix improper logging and potential information leakage in API routes]
**Vulnerability:** Fastify route catch blocks in the API service (`apps.ts`) were logging raw error objects (including `err.stack`) globally using `console.error` and manually constructing an `errObj` which included the stack trace.
**Learning:** Replaced unsafe `errObj` logging and `console.error` with the secure, request-scoped `req.log.error`.
**Prevention:** Always use request-scoped structured logging (`req.log.error`) instead of global loggers or `console.error` in route handlers to ensure proper traceability and prevent sensitive information from bypassing log redaction.
## 2024-03-31 - Webhook Signature Validation Enhancements
**Vulnerability:** The Razorpay webhook signature verification in `billing-service` was vulnerable to two issues:
1. It used `JSON.stringify(req.body)` to reconstruct the payload, which could lead to signature mismatches if formatting differences exist between the raw payload and reconstructed payload. It also opens up potential bypasses.
2. It used standard string comparison `!==` for signature verification, making it vulnerable to timing attacks where an attacker could theoretically guess the signature character-by-character based on response time differences.
**Learning:** Raw request bodies must be captured for reliable and secure signature validation. A custom content parser is an effective way to extract the raw body in Fastify. Furthermore, cryptographic comparisons must always use constant-time operations like `crypto.timingSafeEqual`.
**Prevention:**
1. Always parse and capture raw body for webhook verification (`req.rawBody`).
2. Always use `crypto.timingSafeEqual` for comparing HMACs, signatures, or any security tokens, ensuring the inputs are properly converted to Buffers of equal length before comparison.
## 2024-04-01 - [API Key Authentication Authentication Bypass]
**Vulnerability:** Gateway bypassed standard user/JWT validation if an API Key was used, but didn't actually implement API key validation. The system allowed requests to specify arbitrary appIds via headers without verifying app ownership via the token.
**Learning:** In edge service layer gateways, different token types (JWT vs. API Key) require divergent and explicit authentication paths. Merely proxying tokens to an internal auth service meant API keys either failed, or if they didn't, left app ownership unvalidated.
**Prevention:** API Keys should be checked immediately at the gateway layer by performing a bcrypt comparison of the incoming key against stored hashes associated with the provided application ID. This correctly links the request to the developer's user identity and enforces app ownership.
## 2024-04-02 - [Added Security Headers to Gateway]
**Vulnerability:** Missing security headers on the Gateway service exposed it to common web vulnerabilities like clickjacking, MIME sniffing, and cross-site scripting (XSS).
**Learning:** We can manually add security headers using Fastify's `onSend` hook without introducing new dependencies like `@fastify/helmet` to maintain boundary rules.
**Prevention:** Ensure new services define essential security headers via hooks or custom middleware to provide defense-in-depth security.## 2024-06-25 - [Fix JWT Expiration Check]
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
## 2025-02-22 - [Prevent Information Leakage in Global Error Handler]
**Vulnerability:** Raw error messages and internals (like stack traces from unhandled errors) were exposed to the client in 5xx error responses and lacked request-scoped logging context.
**Learning:** The global error handler in Fastify must sanitize 5xx responses by masking the message with generic text and use `req.log.error` instead of `fastify.log.error` to properly attach request context without leaking state.
**Prevention:** Always mask 5xx error responses. Never use raw error messages in the client response for 500 errors. Always use `req.log.error` in request handlers or error hooks.
## 2024-08-01 - [Remove overly permissive CORS header]
**Vulnerability:** The /chat endpoint in the API service was explicitly setting an `Access-Control-Allow-Origin: *` header, effectively bypassing the global CORS policy and allowing any origin to read stream responses.
**Learning:** Hardcoding wildcard CORS headers on individual routes defeats the purpose of centralized CORS middleware and creates a critical vulnerability where malicious sites can make authenticated requests and read sensitive data.
**Prevention:** Rely entirely on the globally configured CORS plugin (`@fastify/cors`) to handle `Access-Control-Allow-Origin` headers securely based on an allowed list of origins. Never override CORS headers manually in route handlers.
## 2024-06-25 - [Remove Hardcoded Wildcard CORS Header]
**Vulnerability:** A hardcoded `Access-Control-Allow-Origin: *` header was found in the `chat.ts` route handler for streaming responses. This creates an overly permissive CORS configuration, allowing any origin to make cross-origin requests to this endpoint, which could lead to unauthorized access or data exposure.
**Learning:** Hardcoding CORS headers inside individual route handlers bypasses centralized security policies and often results in overly permissive settings like `*`.
**Prevention:** Never manually set `Access-Control-Allow-Origin` or other CORS headers in individual Fastify route handlers (e.g., using `reply.raw.setHeader`). Always rely on the globally registered `@fastify/cors` plugin to enforce the centralized `ALLOWED_ORIGINS` policy.
## 2024-05-18 - [Fix insecure target origin for window.opener.postMessage in web app popup]
**Vulnerability:** The web authentication popup passed sensitive tokens back to its opener using `window.opener.postMessage(..., '*')` or relied solely on a user-provided `origin` query parameter without server-side/build-time validation, which is vulnerable to cross-origin data leakage if an attacker opens the popup from a malicious origin.
**Learning:** `postMessage` calls must always explicitly specify the intended target origin, and relying solely on query parameters for security guarantees is flawed unless strictly validated against a known whitelist.
**Prevention:** Always restrict `targetOrigin` to trusted domains defined via environment variables (`NEXT_PUBLIC_ALLOWED_ORIGINS`). Ensure strict validation before transmission.
## 2026-04-30 - [Remove insecure CORS wildcard on stream responses]
**Vulnerability:** The API chat route explicitly set `Access-Control-Allow-Origin: *` for streaming responses, bypassing the globally configured `@fastify/cors` policy.
**Learning:** Hardcoding wildcard CORS headers in specific routes overrides centralized security configurations, potentially allowing any malicious origin to read sensitive AI chat stream data via cross-origin requests.
**Prevention:** Rely on centralized CORS plugins (e.g., `@fastify/cors`) configured with a strict whitelist of allowed origins (e.g., `ALLOWED_ORIGINS`) and avoid manual overrides in individual route handlers.
## 2024-06-25 - [Fix Overly Permissive CORS Configuration in API Route]
**Vulnerability:** A route handler in `apps/api/src/routes/v1/chat.ts` manually set `reply.raw.setHeader('Access-Control-Allow-Origin', '*');` when handling Server-Sent Events (SSE). This overrode the globally configured `@fastify/cors` plugin with a wildcard, creating an overly permissive CORS configuration that allowed any origin to read the SSE stream.
**Learning:** Manual header overrides within route handlers, especially when bypassing standard response mechanisms (like `reply.hijack()`), can easily bypass centralized security configurations like CORS. Fastify's CORS plugin is designed to handle preflight and origin validation comprehensively; manually setting `Access-Control-Allow-Origin: *` negates this protection for specific endpoints.
**Prevention:** Never manually set CORS headers (`Access-Control-Allow-Origin`, etc.) in individual route handlers. Rely on globally registered CORS plugins (e.g., `@fastify/cors`) configured with a strict whitelist (`ALLOWED_ORIGINS`). Even when hijacking responses for SSE, the global CORS logic should handle the initial headers securely.
## 2025-05-01 - Prevent Error Message Information Leakage
**Vulnerability:** The global fastify error handler leaked sensitive raw error messages and internal details for 5xx errors to the client responses.
**Learning:** Even though a global error handler was registered, it defaulted to sending `appError.message` which exposes database or service failures. Also, the logging wasn't using request-scoped structured logging (`req.log.error`).
**Prevention:** Always mask 5xx error messages with a generic "Internal server error" string and ensure error logging uses request context (`req.log.error`) for proper tracing and security.
## 2024-06-25 - [Fix DoS vulnerability in Redis keys lookup]
**Vulnerability:** The `logout` method in `authService.ts` used the blocking O(N) `redis.keys()` operation to find matching session keys. In a production environment with many keys, this command can block the entire Redis server, leading to a Denial of Service (DoS) for all connected applications.
**Learning:** `redis.keys()` is extremely dangerous in production and should never be used, even in non-critical paths, as it blocks the single-threaded Redis event loop.
**Prevention:** Always use the non-blocking cursor-based `redis.scan` or `scanStream` implementations for matching and retrieving a large number of keys.
## 2024-05-24 - [Fix overly permissive CORS in chat SSE endpoint]
**Vulnerability:** The `/chat` endpoint manually set `Access-Control-Allow-Origin: *` for Server-Sent Events (SSE) responses, bypassing the application's strict CORS policy.
**Learning:** Even when hijacking the Fastify response for SSE (`reply.hijack()`), Fastify's global CORS plugin still correctly handles the CORS headers on the raw response. Manually overriding it with a wildcard introduces a significant security risk.
**Prevention:** Never manually set `Access-Control-Allow-Origin` or other CORS headers in individual route handlers. Always rely on the globally registered `@fastify/cors` plugin to enforce the centralized `ALLOWED_ORIGINS` policy.
## 2024-05-18 - [Remove Wildcard CORS Header in SSE Streams]
**Vulnerability:** A route handler for chat streams manually set `Access-Control-Allow-Origin: *` before hijacking the response for Server-Sent Events (SSE). This created an overly permissive CORS configuration that bypassed the globally registered, centralized CORS policy.
**Learning:** Manual CORS headers should never be applied in individual route handlers, even when bypassing standard Fastify hooks using `reply.hijack()`. Doing so overrides the centralized security policy (like `ALLOWED_ORIGINS`) and can expose sensitive endpoints to cross-origin requests from malicious domains.
**Prevention:** Always rely on the globally registered `@fastify/cors` plugin to enforce the centralized CORS policy. Do not use `reply.raw.setHeader` for CORS headers under any circumstances.
## 2024-05-03 - Remove insecure CORS wildcard in SSE streaming
**Vulnerability:** The `/chat` endpoint manually set `Access-Control-Allow-Origin: *` during Fastify reply hijacking for SSE streaming.
**Learning:** Even when using `reply.hijack()` for Server-Sent Events, Fastify's globally registered `@fastify/cors` plugin handles CORS headers correctly. Manually setting headers can unintentionally override global security policies and introduce overly permissive CORS access.
**Prevention:** Never manually set `Access-Control-Allow-Origin` in individual route handlers. Rely on centralized CORS plugins configured with strict whitelists.
## 2024-06-25 - [Fix overly permissive CORS configuration in API gateway SSE stream]
**Vulnerability:** Fastify route catch-all handlers were manually setting `reply.raw.setHeader('Access-Control-Allow-Origin', '*');` for Server-Sent Events (SSE) streams, allowing cross-origin requests from any domain.
**Learning:** Bypassing global CORS plugins with raw header modifications (`reply.raw.setHeader`) inside specific route handlers breaks centralized security policies. Setting the wildcard origin (`*`) introduces serious risks, potentially exposing sensitive data streams to unauthorized domains.
**Prevention:** Never manually set CORS headers (`Access-Control-Allow-Origin`) in individual Fastify route handlers. Always rely on the globally registered `@fastify/cors` plugin to enforce the centralized `ALLOWED_ORIGINS` policy uniformly across all routes.
## 2024-06-25 - [Fix Overly Permissive CORS Policy in Billing, Credit, and Routing Services]
**Vulnerability:** The billing, credit, and routing services were using overly permissive CORS configurations or lacked centralized CORS management, potentially allowing unauthorized cross-origin access to sensitive service-to-service or client-facing endpoints.
**Learning:** Each microservice, even if internal-facing, should have a clearly defined and centralized CORS policy. Relying on environment-controlled ALLOWED_ORIGINS ensures consistency across the monorepo and prevents ad-hoc, insecure header configurations.
**Prevention:** Always register the @fastify/cors plugin in every service, pulling allowed origins from a centralized configuration (e.g., @ai-gateway/config). Avoid manual header overrides and ensure that credentials and allowed methods/headers are strictly defined.
## 2026-04-22 - [Secure postMessage Target Origin Validation]
**Vulnerability:** In auth popups, window.opener.postMessage used the origin passed in the URL parameters and fell back to the insecure wildcard '*' if missing, allowing potentially malicious openers to receive sensitive access tokens if the origin was omitted or manipulated.
**Learning:** For secure cross-origin communication via window.opener.postMessage (e.g., in auth popups), explicitly validate the target origin against a strict whitelist of trusted domains and never use the insecure wildcard '*'.
**Prevention:** Always parse and validate the origin against a centralized whitelist of allowed domains (e.g., NEXT_PUBLIC_ALLOWED_ORIGINS) before sending sensitive data via postMessage. Discard the message or throw an error if the origin is invalid or missing.
## 2024-05-18 - [Fix insecure target origin for window.opener.postMessage in web app popup]
**Vulnerability:** The web authentication popup passed sensitive tokens back to its opener using window.opener.postMessage(..., '*') or relied solely on a user-provided origin query parameter without server-side/build-time validation, which is vulnerable to cross-origin data leakage if an attacker opens the popup from a malicious origin.
**Learning:** postMessage calls must always explicitly specify the intended target origin, and relying solely on query parameters for security guarantees is flawed unless strictly validated against a known whitelist.
**Prevention:** Always restrict targetOrigin to trusted domains defined via environment variables (NEXT_PUBLIC_ALLOWED_ORIGINS). Ensure strict validation before transmission.
## 2024-06-25 - [Fix Information Leakage in Error Responses]
**Vulnerability:** Fastify catch-all handlers were directly sending raw appError.message on 500 errors to the client, exposing internal implementation details, and relying on fastify.log.error instead of request-scoped logging.
**Learning:** Updated errorHandlerPlugin to exclusively return generic 'Internal server error' messages to the client if the statusCode is >= 500. Additionally, updated the logger to use req.log.error to correctly capture and correlate the real error contexts server-side.
**Prevention:** Always mask 5xx error responses with generic messages. Use request-scoped structured logging (req.log.error) to log the detailed, raw error object internally, ensuring that logs are tied to request contexts securely.
## 2024-06-25 - [Fix improper logging and potential information leakage in API routes]
**Vulnerability:** Fastify route catch blocks in the API service (apps.ts, developers.ts) were logging raw error objects (including err.stack) globally using console.error and fastify.log.error instead of using the secure, request-scoped logger.
**Learning:** Replaced all instances of fastify.log and console.error with the secure, request-scoped req.log.error and req.log.info. Removed manual, unsafe errObj construction.
**Prevention:** Always use request-scoped structured logging (req.log.error) instead of global loggers or console.error in route handlers to ensure proper traceability and prevent sensitive information from bypassing log redaction.
## 2024-04-15 - [HIGH] Add strict security headers
**Vulnerability:** Missing Content Security Policy and X-XSS-Protection headers on auth-service, exposing HTML responses to potential Cross-Site Scripting (XSS) via reflected error messages.
**Learning:** Extracted hardcoded security headers into a unified @ai-gateway/utils plugin and registered it on auth-service, implementing default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;.
**Prevention:** Standardize security headers across all services using a shared plugin or middleware to ensure consistent defense-in-depth.
## 2024-04-15 - [HIGH] Add strict security headers
**Vulnerability:** Missing Content Security Policy and X-XSS-Protection headers on auth-service, exposing HTML responses to potential Cross-Site Scripting (XSS) via reflected error messages.
**Learning:** Extracted hardcoded security headers into a unified @ai-gateway/utils plugin and registered it on auth-service, implementing default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:;.
**Prevention:** Standardize security headers across all services using a shared plugin or middleware to ensure consistent defense-in-depth.
