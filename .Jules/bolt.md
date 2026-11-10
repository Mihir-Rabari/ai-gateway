## 2026-11-01 - Replace Math.max with reduce
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass for array maximum/minimum calculations instead.

## 2026-11-10 - Lift invariant calculations out of loops
**Learning:** Identifying invariant calculations (e.g., `Math.max(values.length - 1, 1)`) inside `.map()` iterations or React render loops and lifting them outside the loop into a constant prevents redundant CPU overhead.
**Action:** Always extract invariant calculations outside of iterators or render loops.
