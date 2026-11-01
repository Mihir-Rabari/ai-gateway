
## 2026-11-01 - Avoid Array intermediate allocations with reduce
**Learning:** Using `Math.max(...array.map(...))` creates unnecessary O(N) intermediate array allocations in memory and can trigger 'Maximum call stack size exceeded' errors when the spread operator evaluates a very large array.
**Action:** When finding the maximum or minimum of an array or property, use a single, memory-efficient pass with `Array.prototype.reduce()`, such as `array.reduce((max, item) => item > max ? item : max, initialValue)`.
