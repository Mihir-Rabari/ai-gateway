## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.

## 2026-04-15 - Fetch Single App By ID
**Learning:** The Console app was fetching the entire list of a developer's apps just to display the details of one specific app, which creates unnecessary overhead as the number of apps grows.
**Action:** Always verify if there is an endpoint to fetch a single item by ID before falling back to fetching the entire list and filtering it on the client side. I implemented a GET `/apps/:id` endpoint and updated the frontend to consume it.

## 2026-04-20 - Targeted DB Queries for Existence Checks
**Learning:** Fetching a full list of resources into memory and using `Array.prototype.some()` to check for existence is inefficient and doesn't scale with user data.
**Action:** Replace `listApps().some()` patterns with targeted `getApp()` or `count()` queries in the repository layer to minimize DB I/O, network latency, and memory allocation.

## 2025-04-28 - Atomic Redis Increment and Expiration
**Learning:** In hot paths like rate limiting, executing `redis.incr` followed conditionally by `redis.expire` can lead to race conditions where a crash leaves a Redis key permanently un-expiring.
**Action:** Replace sequential `incr` and `expire` logic with a single atomic Lua script executed via `redis.eval()`. Ensure the test mock `createRedisMockWithStore` supports `redis.eval`.

## 2024-06-25 - [performance improvement] Atomic rate limiting with Redis Eval
**Learning:** Sequential redis.incr and redis.expire commands are not atomic, which can lead to race conditions where a key is incremented but never expires if the process crashes in between.
**Action:** Implemented atomic rate limiting using Redis eval (Lua script) to ensure both operations happen in a single step.
**Prevention:** Always use atomic Redis operations (eval, multi/exec) for multi-step logic that must maintain consistency.

## 2024-05-03 - [performance improvement] Replace blocking redis.keys with scan
**Learning:** redis.keys is an O(N) blocking operation that can halt the Redis main thread, causing latency spikes in high-traffic applications.
**Action:** Replaced redis.keys with a cursor-based redis.scan loop in the logout path to ensure non-blocking cleanup of refresh tokens.

## 2024-05-02 - Remove redundant credit balance API calls
**Learning:** The /me endpoint already returns the user's creditBalance. Fetching it separately on initial load is unnecessary and increases server load.
**Action:** Removed redundant api.credits.getBalance() calls from the console shell and dashboard layout, relying on the user object from api.auth.me().
## 2025-05-18 - Avoid Bundling Unrelated Fixes
**Learning:** When acting as 'Bolt' (or any specialized persona) to implement a targeted change (e.g., performance optimization), bundling unrelated bug fixes (e.g., fixing a broken regex validation test in a utility package) violates the single-responsibility principle of a PR and will be rejected in code review.
**Action:** Strictly adhere to the assigned scope. If a pre-existing failing test or bug is encountered outside the scope of the assigned optimization, leave it as-is or propose it as a separate task/PR. Do not mix functional bug fixes with performance optimizations.
