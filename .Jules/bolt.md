## 2026-11-02 - Replace Math.max with reduce
**Learning:** Using Math.max with the spread operator on mapped arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors on large datasets.
**Action:** Use a memory-efficient Array.prototype.reduce pass to calculate min/max values without allocating intermediate arrays.
