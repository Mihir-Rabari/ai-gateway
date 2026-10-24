
## 2026-10-24 - Fix timing attack in Codex internal route
**Vulnerability:** Simple string equality check (`!==`) used for internal service secret verification.
**Learning:** In Node.js, standard equality operators leak timing information about secrets.
**Prevention:** Always use `crypto.timingSafeEqual()` to compare secrets after verifying matching buffer lengths.
