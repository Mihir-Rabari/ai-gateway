## 2025-04-12 - Batched Redis Operations in Routing Service
**Learning:** Checking multiple provider health statuses using `Promise.all` with individual `redis.get` calls creates an N+1 query pattern that adds unnecessary latency.
**Action:** When querying multiple keys from Redis (especially in critical paths like routing health checks), use `redis.mget` to fetch all values in a single round-trip. Ensure the Redis mock in tests is updated to support `mget`.
## 2026-04-15 - Fetch Single App By ID
**Learning:** The Console app was fetching the entire list of a developer's apps just to display the details of one specific app, which creates unnecessary overhead as the number of apps grows.
**Action:** Always verify if there is an endpoint to fetch a single item by ID before falling back to fetching the entire list and filtering it on the client side. I implemented a GET `/apps/:id` endpoint and updated the frontend to consume it.
## 2025-04-18 - App Ownership Validation Optmization
**Learning:** Checking for app ownership before fulfilling a usage request by fetching the developer's entire app collection and using `.some()` creates unnecessary memory overhead and adds latency (N+1-like issue).
**Action:** For database existence checks, avoid fetching full collections into memory. Instead, perform targeted queries (e.g. fetching the specific app by ID) in the repository layer to minimize memory overhead and network latency.
