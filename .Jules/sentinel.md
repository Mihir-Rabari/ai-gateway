## 2026-11-09 - Remove hardcoded database credentials
**Vulnerability:** Hardcoded PostgreSQL database URL with username and password found in apps/api/src/routes/v1/apps.ts and apps/api/src/routes/v1/developers.ts.
**Learning:** Fallback database URLs in code often unintentionally expose local or staging credentials, which can become a security risk if the codebase is exposed or if the same credentials are reused across environments.
**Prevention:** Never include hardcoded secrets (passwords, tokens, API keys) even as defaults. Always throw an error if a required secret environment variable like 'DATABASE_URL' is missing, or rely exclusively on the environment configuration without inline fallback secrets.
## 2026-11-09 - Ensure journal files are not overwritten
**Learning:** Overwriting the markdown journal (e.g., using `>` instead of `>>`) deletes previous learnings.
**Prevention:** Use append operations (`>>` or `fs.appendFileSync`) when writing to the journal file to preserve all historical critical learnings.
