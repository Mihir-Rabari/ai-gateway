## 2025-02-14 - Keyboard navigation focus indicators in dark mode
**Learning:** In completely custom dark-mode interfaces, native browser focus outlines are often removed or overridden, making the UI completely inaccessible for keyboard users without dedicated `focus-visible` styling.
**Action:** Always ensure foundational interactive primitives (Buttons, Inputs, TextAreas) include explicit `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` styling or similar distinct focus treatments, especially when base focus styles are overridden.
