## 2026-10-24 - Avoid Math.max(...array) on Large Arrays
**Learning:** Using `Math.max(...array)` spreads the entire array into individual arguments. If the array is very large, this can throw a "Maximum call stack size exceeded" error. It also requires an O(N) memory allocation to create the arguments array.
**Action:** Use `array.reduce((max, val) => (val > max ? val : max), defaultVal)` which iterates over the array without allocating a new array or expanding the stack.
