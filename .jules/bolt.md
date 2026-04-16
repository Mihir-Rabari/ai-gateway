## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.

## $(date +%Y-%m-%d) - Targeted DB Queries over Full Collection Scans
**Learning:** Checking resource existence by fetching an entire collection into memory (`appService.listApps`) and searching it via array methods (`.some()`) is an $O(N)$ operation that wastes database bandwidth and server memory.
**Action:** Implement targeted $O(1)$ queries in the repository layer (e.g., `SELECT 1 FROM table WHERE ...`) and use them in API routes for existence checks.
