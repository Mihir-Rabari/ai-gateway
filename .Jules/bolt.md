## 2026-10-29 - Avoid O(N) array intermediate allocation in charts
**Learning:** Using `Math.max(...values)` creates a new intermediate array using the spread operator, which takes O(N) memory and time. For a performance-obsessed codebase, it is better to avoid this allocation overhead by using `Array.prototype.reduce()`.
**Action:** Always replace `Math.max(...array)` with `array.reduce((m, v) => (v > m ? v : m), 1)` especially when arrays can be large.
