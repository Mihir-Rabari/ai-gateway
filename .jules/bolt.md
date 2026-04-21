## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.
## 2026-04-15 - Fetch Single App By ID
**Learning:** The Console app was fetching the entire list of a developer's apps just to display the details of one specific app, which creates unnecessary overhead as the number of apps grows.
**Action:** Always verify if there is an endpoint to fetch a single item by ID before falling back to fetching the entire list and filtering it on the client side. I implemented a GET `/apps/:id` endpoint and updated the frontend to consume it.

## 2024-05-18 - Atomic Redis operations for performance
**Learning:** Sequential Redis operations (`incr` followed by `expire` under a condition) are susceptible to race conditions (e.g. if the application crashes between `incr` and `expire`, the key might never expire and stay in Redis forever). It also incurs multiple network round-trips.
**Action:** Replace `incr` followed by `expire` with a single atomic Lua script via `redis.eval` to guarantee atomicity and reduce network latency, ensuring more robust rate-limiting and counter implementations.
