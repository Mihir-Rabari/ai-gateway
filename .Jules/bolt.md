## 2026-10-31 - Avoid Array Spread Operator for Max Calculation
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass instead of spreading the array into `Math.max()`.
