## 2026-11-01 - Replace Math.max with reduce
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass for array maximum/minimum calculations instead.

## 2026-11-11 - Lift loop invariants
**Learning:** Identifying invariant calculations like `Math.max(values.length - 1, 1)` inside `.map()` iterations and lifting them outside the loop into a constant prevents redundant CPU overhead.
**Action:** Always check loop bodies for calculations that do not depend on the loop variable and move them out to optimize performance.
