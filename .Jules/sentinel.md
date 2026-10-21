## 2026-10-21 - Fix Timing Attack in Codex Routes
**Vulnerability:** A simple string comparison `!==` was used to verify internal service secrets.
**Learning:** This exposes the application to timing attacks because string comparison exits as soon as a mismatch is found, allowing attackers to guess the secret character by character.
**Prevention:** Always use `timingSafeEqual` from `crypto` to compare sensitive strings (after converting to buffers and checking lengths).
