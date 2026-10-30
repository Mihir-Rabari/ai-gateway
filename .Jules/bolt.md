## 2026-10-30 - Spread Operator Overhead in Math.max
**Learning:** Using `Math.max(...array)` on potentially large arrays creates an O(N) intermediate memory allocation and can cause 'Maximum call stack size exceeded' errors.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass (e.g. `array.reduce((max, val) => (val > max ? val : max), 1)`) instead of the spread operator for large or unknown array sizes.
