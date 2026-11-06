## 2026-11-01 - Replace Math.max with reduce
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass for array maximum/minimum calculations instead.
## 2026-11-06 - Lifting Math.max out of render loops
**Learning:** Invariant calculations like Math.max(values.length - 1, 1) inside .map() iterations in React components create redundant CPU overhead.
**Action:** Always identify and lift invariant calculations outside the loop into a constant to prevent redundant CPU overhead.
