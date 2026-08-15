## 2024-08-15 - Parallelize bcrypt comparisons in API Key Validation
**Learning:** Sequential `bcrypt.compare` calls block libuv's thread pool less efficiently than parallelized calls. A sequential loop checking multiple hashed API keys against an incoming key causes N round-trips to the thread pool, drastically increasing latency when multiple hashes are stored.
**Action:** Always wrap independent `bcrypt.compare` or `bcrypt.hash` operations in `Promise.all` when evaluating multiple hashes simultaneously to decrease total request latency.
