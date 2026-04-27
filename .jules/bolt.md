## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.
## 2026-04-15 - Fetch Single App By ID
**Learning:** The Console app was fetching the entire list of a developer's apps just to display the details of one specific app, which creates unnecessary overhead as the number of apps grows.
**Action:** Always verify if there is an endpoint to fetch a single item by ID before falling back to fetching the entire list and filtering it on the client side. I implemented a GET `/apps/:id` endpoint and updated the frontend to consume it.

## 2026-04-20 - Targeted DB Queries for Existence Checks
**Learning:** Fetching a full list of resources into memory and using `Array.prototype.some()` to check for existence is inefficient and doesn't scale with user data.
**Action:** Replace `listApps().some()` patterns with targeted `getApp()` or `count()` queries in the repository layer to minimize DB I/O, network latency, and memory allocation.

## 2026-04-25 - Atomic Rate Limiting with Redis
**Learning:** Sequential calls to `redis.incr` followed conditionally by `redis.expire` can cause a race condition if the process crashes or gets interrupted between the two calls, leaving a key without an expiration and permanently occupying Redis memory. Additionally, two round-trips over the network increase latency on hot paths like request rate limiting.
**Action:** When incrementing and conditionally expiring keys in Redis (especially on the gateway hot path), use an atomic Lua script executed via `redis.eval` to guarantee atomicity and reduce network round-trips. Always remember to update the corresponding Redis mocks in test files to include the `eval` function.
