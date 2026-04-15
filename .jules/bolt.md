## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.

## 2024-04-14 - Optimized App Exists Check
**Learning:** Checking for an item's existence by fetching all items and using `.some()` on the array (e.g. `await appService.listApps(req.userId)`) leads to high memory and compute overhead when the dataset grows, causing an O(N) performance bottleneck for what should be an O(1) existence check.
**Action:** Replaced `.some()` array lookups with targeted database `EXISTS`/`COUNT` queries via targeted repository methods like `checkActiveAppExists`, dramatically reducing data transfer latency and memory overhead.
