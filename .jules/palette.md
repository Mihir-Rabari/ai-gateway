
## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.

## 2026-04-16 - [Keyboard Focus and External Links]
**Learning:** Added keyboard focus indicators (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`) to custom interactive elements (Buttons, TextInputs, TextAreas, and standard links) is crucial for accessibility without breaking the dark aesthetic. For external links, `target="_blank"` and `rel="noopener noreferrer"` are essential standard UX and security best practices.
**Action:** Ensure all new custom interactive elements implement consistent focus-visible styling and proper external link attributes across the design system components.
