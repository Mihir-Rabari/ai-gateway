## 2026-10-28 - Spread operator call stack risk with Math.max
**Learning:** Using `Math.max(...array)` with the spread operator creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' on large arrays (around ~100k+ items in V8), which is a bottleneck when rendering charts with many data points.
**Action:** Always use `Array.prototype.reduce()` instead for calculating the maximum or minimum of potentially large arrays.
