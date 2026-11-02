## 2024-05-13 - Array Math Optimization
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks "Maximum call stack size exceeded" errors.
**Action:** Replace `Math.max(...array)` with a memory-efficient `Array.prototype.reduce()` pass to prevent stack overflows and improve memory usage.
