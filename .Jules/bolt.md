
## 2026-10-26 - Math.max with spread operator
**Learning:** Using Math.max(...array) on large arrays creates an O(N) intermediate memory allocation and can cause Maximum call stack size exceeded errors.
**Action:** Use a memory-efficient Array.prototype.reduce() pass instead for finding minimum or maximum values in large datasets.
