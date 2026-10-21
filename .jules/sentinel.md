## 2026-10-20 - Fix Timing Attack Vulnerability in Internal Secret Comparison
**Vulnerability:** The internal secret in codexRoutes.ts was compared using a simple string equality check, which is susceptible to timing attacks.
**Learning:** Security-sensitive string comparisons, such as API keys and internal secrets, must be done in constant time to prevent side-channel leaks.
**Prevention:** Always use crypto.timingSafeEqual with Buffers of equal length when comparing sensitive tokens.
