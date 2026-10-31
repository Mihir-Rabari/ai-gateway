## 2026-10-31 - Bolt: Avoid Math.max with spread and map
**Learning:** Using `Math.max(...items.map((i) => i.value))` on potentially large arrays is an anti-pattern. It incurs O(N) memory overhead for creating the mapped array, further overhead for spreading arguments, and risks stack overflow for very large arrays.
**Action:** Replace `Math.max(...items.map(...))` with a single `Array.prototype.reduce()` pass (e.g., `items.reduce((max, item) => item.value > max ? item.value : max, 1)`) for better memory and CPU performance.
