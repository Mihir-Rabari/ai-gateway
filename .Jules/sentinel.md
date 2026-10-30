## 2024-10-31 - Fix Timing Attack in Internal Secret Check
**Vulnerability:** String comparison `!==` was used for `clientSecret` and `internalSecret` checking in `codexRoutes.ts`.
**Learning:** Checking string equality in an early return could expose timing differences.
**Prevention:** Use `crypto.timingSafeEqual` for string comparison in authentication flows.
## 2026-10-30 - Fix Timing Attack in Internal Secret Check
**Vulnerability:** String comparison was used for clientSecret and internalSecret checking in codexRoutes.ts.
**Learning:** Checking string equality in an early return could expose timing differences.
**Prevention:** Use crypto.timingSafeEqual for string comparison in authentication flows.
