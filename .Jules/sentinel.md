## 2024-10-23 - Prevent timing attacks with timingSafeEqual
**Vulnerability:** Internal secrets were being compared using standard string equality (`clientSecret !== internalSecret`), making it vulnerable to timing attacks.
**Learning:** Comparing security-sensitive strings using the standard equality operator (`!==`) can leak information about the secret since it returns early on the first mismatch.
**Prevention:** Always use `timingSafeEqual` from the `crypto` module when comparing secrets, passwords, or tokens. Ensure both values are converted to `Buffer` and checked for equal length before calling `timingSafeEqual`.
