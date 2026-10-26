## 2026-10-26 - Replace Math.max with reduce for chart data arrays
**Learning:** The use of Math.max(...array) in charting components with potentially large datasets causes an O(N) intermediate memory allocation and risks exceeding the call stack limit. It is a performance and stability anti-pattern in this codebase.
**Action:** Always use Array.prototype.reduce() to calculate maximum/minimum values for data arrays instead of spread operators to ensure stable, O(1) memory usage.
