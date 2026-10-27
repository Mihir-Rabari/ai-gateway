
## 2026-10-27 - Avoid Math.max with spread operator for large arrays
**Learning:** Using Math.max(...array) with the spread operator on large arrays creates an O(N) intermediate memory allocation and can cause 'Maximum call stack size exceeded' errors.
**Action:** Use Array.prototype.reduce() to find the maximum/minimum of an array efficiently without risking stack overflow or intermediate allocations.
