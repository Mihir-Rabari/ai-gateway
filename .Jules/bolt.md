## 2026-11-01 - Replace Math.max with reduce
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass for array maximum/minimum calculations instead.
## 2026-11-04 - Lift invariant calculations out of map loops
**Learning:** Invariant calculations like `Math.max(values.length - 1, 1)` inside `.map()` iterations within React components cause redundant CPU overhead on every render loop.
**Action:** Lift invariant calculations outside of the map loop into a constant to prevent redundant operations and improve rendering performance.
