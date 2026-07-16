## 2024-05-24 - Parallelize bcrypt.hash calls
**Learning:** Native asynchronous operations that utilize the Node.js libuv thread pool (like multiple independent `bcrypt.hash` calls) should be parallelized using `Promise.all` rather than awaited sequentially.
**Action:** Always check for independent operations that can be parallelized in a single request flow to reduce total response latency.
