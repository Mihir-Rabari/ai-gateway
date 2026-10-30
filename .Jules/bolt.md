## 2026-10-30 - Optimize array maximum calculations
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks "Maximum call stack size exceeded" errors.
**Action:** Used `Array.prototype.reduce()` to find the maximum in a single, memory-efficient pass.
