## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.
## 2026-04-15 - Fetch Single App By ID
**Learning:** The Console app was fetching the entire list of a developer's apps just to display the details of one specific app, which creates unnecessary overhead as the number of apps grows.
**Action:** Always verify if there is an endpoint to fetch a single item by ID before falling back to fetching the entire list and filtering it on the client side. I implemented a GET `/apps/:id` endpoint and updated the frontend to consume it.

## 2026-04-20 - Targeted DB Queries for Existence Checks
**Learning:** Fetching a full list of resources into memory and using `Array.prototype.some()` to check for existence is inefficient and doesn't scale with user data.
**Action:** Replace `listApps().some()` patterns with targeted `getApp()` or `count()` queries in the repository layer to minimize DB I/O, network latency, and memory allocation.

## 2024-06-13 - Replace Redis incr/expire with atomic Lua eval
**Learning:** Sequential Redis calls like `incr` and `expire` are not atomic, which can cause race conditions. For example, if the application crashes immediately after `incr` but before `expire`, the Redis key might never expire, causing permanent rate limiting or memory leaks. Using an atomic Lua script executing `incr` and conditionally calling `expire` reduces network round trips and avoids race condition issues while preserving expiration logic.
**Action:** Use an atomic Lua `eval` script instead of sequential `incr` and `expire` calls in hot paths like rate limiting to eliminate race conditions and improve performance. Update corresponding Redis mocks to support `eval`.
