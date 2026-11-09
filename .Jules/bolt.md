## 2026-11-01 - Replace Math.max with reduce
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass for array maximum/minimum calculations instead.

## 2026-11-09 - Lift invariant calculations outside render loops
**Learning:** Recalculating invariant values like `Math.max(values.length - 1, 1)` inside `.map()` iterations or React render loops creates redundant CPU overhead and slows down array processing.
**Action:** Identify and lift invariant calculations outside loops into constants to prevent unnecessary computations during rendering.
