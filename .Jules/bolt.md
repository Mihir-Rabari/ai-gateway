## 2024-05-15 - Prevent Math.max and spread operator on large arrays
**Learning:** Found multiple instances of `Math.max(...items.map())` and `Math.max(...values)` in UI components. This creates O(N) intermediate array allocation overhead and spread operator call stack limits, which can throw "Maximum call stack size exceeded" on large datasets (especially API responses).
**Action:** Replace spread operators and intermediate allocations with a single `.reduce()` pass (e.g., `(values ?? []).reduce((max, val) => (val > max ? val : max), 1)`) for better performance and safety.
