## 2026-10-20 - Replace Math.max with reduce
**Learning:** Using Math.max(...array.map(fn)) creates O(N) intermediate array allocations and uses the spread operator which can cause Maximum call stack size exceeded errors for large arrays in React components.
**Action:** Replace these patterns with a single .reduce() pass to improve memory efficiency and prevent call stack errors.
