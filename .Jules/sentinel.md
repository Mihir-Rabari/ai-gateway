## 2026-10-23 - Fix Timing Attack in Codex Routes
**Vulnerability:** Simple string equality check used for internal secret validation in POST /internal/auth/codex/token.
**Learning:** Timing attacks can guess secrets when simple equality is used because it returns early on the first mismatched byte.
**Prevention:** Always use crypto.timingSafeEqual and compare buffers of identical lengths.
