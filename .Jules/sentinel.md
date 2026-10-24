
## 2024-10-24 - Fix Timing Attack in Codex Routes
**Vulnerability:** The internal endpoint `/internal/auth/codex/token` used a standard string equality operator (`clientSecret !== internalSecret`) to verify the internal service secret.
**Learning:** This approach is susceptible to timing attacks, as the standard equality operator evaluates character by character, returning immediately on the first mismatch, allowing an attacker to deduce the secret.
**Prevention:** For sensitive string comparisons, especially involving secrets or tokens, always use `timingSafeEqual` from the `crypto` module. Ensure strings are converted to Buffers and verify their lengths match before comparison to prevent `RangeError`s.
