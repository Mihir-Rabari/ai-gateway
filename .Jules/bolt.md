## 2026-11-01 - Replace Math.max with reduce
**Learning:** Using `Math.max(...array)` with the spread operator on potentially large arrays creates an O(N) intermediate memory allocation and risks 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass for array maximum/minimum calculations instead.

## 2026-11-04 - Lift invariant calculations outside render loops
**Learning:** Re-computing constant expressions (like `Math.max(array.length - 1, 1)`) inside a `.map` or render loop introduces redundant overhead on every iteration.
**Action:** Extract invariant calculations to constants before the loop to optimize CPU cycles.
