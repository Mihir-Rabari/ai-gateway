
## 2026-10-24 - Math.max Spread Anti-Pattern
**Learning:** Using Math.max(...array) on potentially large arrays causes O(N) intermediate allocations and risks Maximum call stack size exceeded errors
**Action:** Use array.reduce() instead for safe, memory-efficient maximum computation
