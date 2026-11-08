## 2026-11-07 - Fix Hardcoded Database Credentials
**Vulnerability:** Found hardcoded database credentials ('gateway_user:gateway_pass') as fallback connection strings in apps/api/src/routes/v1/apps.ts and developers.ts.
**Learning:** Even fallback values can leak sensitive credentials if they match local dev or test environments, creating a risk if committed.
**Prevention:** Rely on process.env without providing hardcoded default credential strings.

## 2026-11-08 - Fix Hardcoded Database Credentials
**Vulnerability:** Found hardcoded database credentials ('gateway_user:gateway_pass') as fallback connection strings in apps/api/src/routes/v1/apps.ts and developers.ts.
**Learning:** Even fallback values can leak sensitive credentials if they match local dev or test environments, creating a risk if committed.
**Prevention:** Rely on process.env without providing hardcoded default credential strings.

## 2026-11-08 - Fix Hardcoded Database Credentials
**Vulnerability:** Found hardcoded database credentials ('gateway_user:gateway_pass') as fallback connection strings in apps/api/src/routes/v1/apps.ts and developers.ts.
**Learning:** Even fallback values can leak sensitive credentials if they match local dev or test environments, creating a risk if committed.
**Prevention:** Rely on process.env without providing hardcoded default credential strings.
