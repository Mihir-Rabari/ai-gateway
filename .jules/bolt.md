## 2024-04-19 - [Atomic Rate Limiting with Redis Lua]
**Learning:** Sequential Redis operations (`incr` followed conditionally by `expire`) in a fixed-window rate limiter require multiple network round trips and introduce a dangerous race condition: if the app crashes between the two commands, the key never expires, permanently locking the user out.
**Action:** Always combine `incr` and `expire` into a single atomic Lua script (`eval`) to guarantee both atomicity and a reduction in network latency per rate limit window initialization. Update test mocks to include `eval` support when doing so.
