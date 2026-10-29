## 2024-10-29 - Optimize Array.max operations
**Learning:** Avoid using `Math.max(...array)` with the spread operator on potentially large arrays, as it creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass instead.
