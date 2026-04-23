## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.

## 2026-04-18 - External Links & Invalid HTML Nesting
**Learning:** External links should always have `target="_blank"`, `rel="noopener noreferrer"`, and explicit `focus-visible` styles (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`) for security and accessibility. Furthermore, wrapping a custom `<Button>` component (which renders a `<button>`) inside an `<a>` or Next.js `<Link>` tag creates invalid HTML5 that disrupts screen readers.
**Action:** Replace invalid `<a><Button>...</Button></a>` nesting with a single `<a>` (or `<Link>`) element and apply the exact Tailwind utility classes from the intended Button variant directly onto the anchor tag to ensure valid markup while preserving visual parity.
