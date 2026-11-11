## 2026-11-11 - Remove Hardcoded Database Fallback Credentials
**Vulnerability:** Found hardcoded fallback database credentials (`postgresql://gateway_user:gateway_pass@localhost:5432/ai_gateway`) in `apps/api/src/routes/v1/apps.ts` and `apps/api/src/routes/v1/developers.ts`.
**Learning:** Hardcoding secrets or credentials as default fallbacks creates a CRITICAL security vulnerability where credentials can be accidentally leaked in public repositories or logs. Fallbacks should always rely on secure configuration management or explicitly throw an error if the credential is missing.
**Prevention:** Always validate that sensitive environment variables are present during startup and do not provide sensitive fallback values in code.
