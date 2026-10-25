
## 2026-10-25 - Replace Math.max with reduce
**Learning:** Using Math.max(...array) with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks Maximum call stack size exceeded errors.
**Action:** Use a memory-efficient Array.prototype.reduce() pass instead.
