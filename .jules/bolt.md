## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.
## 2026-04-15 - Fetch Single App By ID
**Learning:** The Console app was fetching the entire list of a developer's apps just to display the details of one specific app, which creates unnecessary overhead as the number of apps grows.
**Action:** Always verify if there is an endpoint to fetch a single item by ID before falling back to fetching the entire list and filtering it on the client side. I implemented a GET `/apps/:id` endpoint and updated the frontend to consume it.
## 2025-04-21 - Atomic Redis Operations in Gateway Service
**Learning:** Sequential calls to `redis.incr` and `redis.expire` can cause race conditions if the application crashes in between, leaving a rate limit key permanently un-expiring.
**Action:** Replaced sequential `incr` and `expire` with a single atomic `redis.eval` Lua script to perform both operations and save a Redis network roundtrip. Updated test mocks to support `eval`.
