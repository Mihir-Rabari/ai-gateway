## 2024-04-18 - Internal Error Information Disclosure
**Vulnerability:** Found information disclosure where Fastify route handlers were leaking raw internal error messages (`err.message`) and stack traces via standard 500 responses and sending them via `console.error` bypassing structured logs.
**Learning:** Returning exception details from route handlers risks exposing stack details, internal IPs, and downstream service URLs to external consumers, failing the fail-securely principle.
**Prevention:** Always catch and log the full error internally using the request-scoped structured logger (`req.log.error(err, 'Failed to process')`) and return a generic `Internal server error` message to the client.
