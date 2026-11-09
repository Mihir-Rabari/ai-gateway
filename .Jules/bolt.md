## 2026-11-01 - Replace Math.max with reduce
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass for array maximum/minimum calculations instead.

## 2026-11-09 - Lift invariant calculations outside map iteration
**Learning:** React render loops and `.map()` iterations often execute redundantly. If values inside loops are invariants (e.g., calculations based entirely on array length rather than iteration values), executing them inside the loop adds unnecessary CPU overhead.
**Action:** Identify invariant calculations (like `Math.max(values.length - 1, 1)`) inside map loops or React render cycles, and lift them outside the loop to optimize iterations and prevent redundant allocations.
