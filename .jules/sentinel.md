## 2024-03-31 - Webhook Signature Validation Enhancements
**Vulnerability:** The Razorpay webhook signature verification in `billing-service` was vulnerable to two issues:
1. It used `JSON.stringify(req.body)` to reconstruct the payload, which could lead to signature mismatches if formatting differences exist between the raw payload and reconstructed payload. It also opens up potential bypasses.
2. It used standard string comparison `!==` for signature verification, making it vulnerable to timing attacks where an attacker could theoretically guess the signature character-by-character based on response time differences.
**Learning:** Raw request bodies must be captured for reliable and secure signature validation. A custom content parser is an effective way to extract the raw body in Fastify. Furthermore, cryptographic comparisons must always use constant-time operations like `crypto.timingSafeEqual`.
**Prevention:**
1. Always parse and capture raw body for webhook verification (`req.rawBody`).
2. Always use `crypto.timingSafeEqual` for comparing HMACs, signatures, or any security tokens, ensuring the inputs are properly converted to Buffers of equal length before comparison.## $(date +%Y-%m-%d) - [Added Security Headers to Gateway]
**Vulnerability:** Missing security headers on the Gateway service exposed it to common web vulnerabilities like clickjacking, MIME sniffing, and cross-site scripting (XSS).
**Learning:** We can manually add security headers using Fastify's `onSend` hook without introducing new dependencies like `@fastify/helmet` to maintain boundary rules.
**Prevention:** Ensure new services define essential security headers via hooks or custom middleware to provide defense-in-depth security.

## 2024-04-01 - [API Key Authentication Authentication Bypass]
**Vulnerability:** Gateway bypassed standard user/JWT validation if an API Key was used, but didn't actually implement API key validation. The system allowed requests to specify arbitrary appIds via headers without verifying app ownership via the token.
**Learning:** In edge service layer gateways, different token types (JWT vs. API Key) require divergent and explicit authentication paths. Merely proxying tokens to an internal auth service meant API keys either failed, or if they didn't, left app ownership unvalidated.
**Prevention:** API Keys should be checked immediately at the gateway layer by performing a bcrypt comparison of the incoming key against stored hashes associated with the provided application ID. This correctly links the request to the developer's user identity and enforces app ownership.
