## 2026-04-15 - Focus indicators for custom interactive elements
**Learning:** Custom interactive elements (Buttons, TextInputs, TextAreas in `apps/console`) often lack clear keyboard focus indicators when default outlines are removed, making keyboard navigation difficult for keyboard-only users.
**Action:** Always include `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` on interactive elements to ensure clear focus states while maintaining the app's dark aesthetic.
