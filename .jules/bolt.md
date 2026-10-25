## 2024-10-25 - Use reduce instead of Math.max(...array) for large arrays
**Learning:** Using `Math.max(...array)` on potentially large arrays creates an O(N) intermediate memory allocation and can risk "Maximum call stack size exceeded" errors if the array gets too large.
**Action:** Use a memory-efficient `Array.prototype.reduce()` pass (e.g. `array.reduce((max, val) => val > max ? val : max, -Infinity)`) to calculate the maximum value of an array safely and faster.
