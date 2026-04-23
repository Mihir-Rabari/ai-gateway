## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.
## 2026-04-15 - Fetch Single App By ID
**Learning:** The Console app was fetching the entire list of a developer's apps just to display the details of one specific app, which creates unnecessary overhead as the number of apps grows.
**Action:** Always verify if there is an endpoint to fetch a single item by ID before falling back to fetching the entire list and filtering it on the client side. I implemented a GET `/apps/:id` endpoint and updated the frontend to consume it.

## 2026-04-20 - Targeted DB Queries for Existence Checks
**Learning:** Fetching a full list of resources into memory and using `Array.prototype.some()` to check for existence is inefficient and doesn't scale with user data.
**Action:** Replace `listApps().some()` patterns with targeted `getApp()` or `count()` queries in the repository layer to minimize DB I/O, network latency, and memory allocation.

## 2026-04-23 - Fix circuit breaker and rate limiting un-expiring redis keys
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency. Using sequential INCR and EXPIRE can also lead to race conditions where the application crashes before the EXPIRE is executed. The memory explicitly details how to implement atomic Lua scripts for both sliding window (unconditional EXPIRE) and fixed window (conditional EXPIRE). The circuit breaker is a sliding window, while rate limiting is a fixed window.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Replace sequential `redis.incr` and `redis.expire` with a single atomic Lua script executed via `redis.eval()` taking care to use conditional EXPIRE for rate limit fixed window and unconditional EXPIRE for circuit breaker sliding window logic. Ensure the Redis mock in tests is updated to support `mget` and `eval`.
