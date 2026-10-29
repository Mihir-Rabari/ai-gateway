
## 2026-10-29 - Fix Timing Attack in Secret Comparison
**Vulnerability:** Comparing an external secret (from headers) against an internal secret using standard string inequality (`!==`).
**Learning:** This exposes a timing attack, potentially allowing an attacker to deduce the secret character by character by measuring request completion times. It existed because typical string equality checking is the default mindset in Javascript rather than `crypto.timingSafeEqual`.
**Prevention:** Always use Node.js `crypto.timingSafeEqual()` to compare secrets/tokens in constant time.
