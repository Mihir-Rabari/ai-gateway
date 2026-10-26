## 2026-10-26 - Avoid Math.max with spread operator
**Learning:** Using Math.max(...array) with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient Array.prototype.reduce() pass instead.
