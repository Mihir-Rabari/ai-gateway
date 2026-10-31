## 2026-10-31 - Fix Timing Attack in Codex Internal Route
**Vulnerability:** String comparison used for internal service secret verification, which allows timing attacks.
**Learning:** `timingSafeEqual` should be used instead of `!==` to prevent token brute-forcing via timing side channels.
**Prevention:** Always verify secrets using `timingSafeEqual` after checking buffers for length equality.
