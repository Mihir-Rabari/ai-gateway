## 2026-10-27 - Avoid Math.max with array spread on large data
**Learning:** Using Math.max(...array) with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient Array.prototype.reduce() pass instead of array spread.
