## 2024-07-07 - Add Focus Visible Styles to Raw Buttons
**Learning:** Raw `<button>` elements in the app (like the mobile Exit button in ConsoleLayout) often lack keyboard focus indicators compared to shared components (like `<Button>`).
**Action:** When using raw `<button>` elements to bypass component padding constraints, always manually add `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700` styling (or equivalent) for keyboard accessibility.
