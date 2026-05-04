
## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.

## 2026-04-26 - Missing ARIA label on unlabelled close button
**Learning:** Found a missing accessible name on the "Dismiss" toast `<button>` in `apps/console/src/components/console/toaster.tsx` even though it has text inside, it isn't fully announced properly by some screen readers without an explicit `aria-label` when it also has tracking/utility classes.
**Action:** Add `aria-label="Dismiss toast"` to interactive action buttons in generic notification components.
