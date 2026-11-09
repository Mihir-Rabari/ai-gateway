## 2026-11-09 - Hardcoded PostgreSQL Database Credentials
**Vulnerability:** Found hardcoded fallback database credentials (`postgresql://gateway_user:gateway_pass@localhost:5432/ai_gateway`) in database pool configurations.
**Learning:** Default fallbacks for local development often leak into production code when an environment variable is unset, creating a risk of unauthorized database access if the code is exposed.
**Prevention:** Fail fast on missing environment variables instead of providing hardcoded credential fallbacks. For CI and testing environments, inject the required test variables in the workflow configuration (`.github/workflows/ci.yml`).
