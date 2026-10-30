## 2024-10-30 - O(N) intermediate array allocation and spread operator overhead
**Learning:** Found usage of Math.max(...array) which can cause O(N) intermediate array allocations and "Maximum call stack size exceeded" errors with large arrays.
**Action:** Replace Math.max(...array) with a single pass using Array.prototype.reduce() to avoid spread overhead and intermediate allocations.
