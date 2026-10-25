## 2026-10-25 - Fixed Timing Attack in Secret Comparison
**Vulnerability:** Simple string comparison (clientSecret !== internalSecret) was used to verify internal authentication secrets.
**Learning:** This exposes the application to timing attacks, where an attacker can deduce the secret based on the time it takes the server to reject incorrect characters.
**Prevention:** Always cast secrets to Buffers and use crypto.timingSafeEqual(), ensuring lengths are also verified prior to comparison to prevent byte-length mismatches.
