## 2026-10-29 - Avoid Math.max on large arrays
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks "Maximum call stack size exceeded" errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass instead to calculate maximum or minimum values.
