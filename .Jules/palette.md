## 2023-10-27 - Disabled Button Accessibility
**Learning:** Found components using `disabled:pointer-events-none`. This suppresses native tooltips (the `title` attribute) on disabled elements, which hurts accessibility as users can't see *why* a button is disabled.
**Action:** Replace `disabled:pointer-events-none` with `disabled:cursor-not-allowed` to maintain accessibility while still indicating the disabled state visually.
## 2024-03-27 - Disabled Button Accessibility
**Learning:** Found components using `disabled:pointer-events-none`. This suppresses native tooltips (the `title` attribute) on disabled elements, which hurts accessibility as users can't see why a button is disabled.
**Action:** Replace `disabled:pointer-events-none` with `disabled:cursor-not-allowed` to maintain accessibility while still indicating the disabled state visually.
