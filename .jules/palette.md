## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.

## 2026-04-15 - Focus indicators for custom interactive elements
**Learning:** Custom interactive elements (Buttons, TextInputs, TextAreas in `apps/console`) often lack clear keyboard focus indicators when default outlines are removed, making keyboard navigation difficult for keyboard-only users.
**Action:** Always include `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` on interactive elements to ensure clear focus states while maintaining the app's dark aesthetic.
