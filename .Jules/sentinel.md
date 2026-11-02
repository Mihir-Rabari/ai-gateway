## 2026-11-02 - Timing Attack Vulnerability in Codex Routes
**Vulnerability:** A simple string equality operator (`!==`) was being used to verify the internal service secret in the `/internal/auth/codex/token` endpoint.
**Learning:** Comparing sensitive internal tokens using simple string equality creates a timing attack vulnerability because the operation returns early on the first mismatched character, allowing an attacker to guess the token character by character based on response time.
**Prevention:** Always use `crypto.timingSafeEqual()` when comparing sensitive tokens, secrets, or passwords in Node.js applications. Ensure both inputs are cast to `Buffer` and checked for equal length prior to the comparison.
