
## 2026-04-12 - Missing ARIA Labels on Ad-Hoc Icon Buttons
**Learning:** In the developer console UI (`apps/console`), there is a pattern of using inline, ad-hoc `<button>` elements rather than standard design system components for small actions like the password visibility toggle (`Eye`/`EyeOff`). These ad-hoc buttons often lack critical accessibility attributes such as `aria-label` or `title`, and sometimes miss focus-visible states for keyboard users.
**Action:** Always verify small interactive elements (especially icon-only buttons) for proper aria-labels and keyboard focus indicators, and consider standardizing them into a reusable `<IconButton />` component in the future to prevent regressions.
## 2026-04-22 - Reusable IconButton component
**Learning:** We refactored ad-hoc icon-only buttons to use a standard reusable `<IconButton>` component. By making `aria-label` a required prop in the TypeScript definition of `<IconButton>`, we statically enforce accessibility for all future icon buttons added to the console UI. The component also gracefully falls back to using the `aria-label` as the `title` tooltip if no explicit `title` is provided, further improving UX.
**Action:** Use the `<IconButton>` component from `system.tsx` for any new icon-only buttons to ensure they are accessible by default.


## 2026-05-18 - Fix interactive element nesting for accessibility
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Implemented Radix UI's `Slot` utility via an `asChild` prop on the `Button` component. Ensure the `Slot` receives exactly one React element child (e.g., by separating `asChild` rendering from conditional internal elements like loading spinners) to avoid `React.Children.only` build errors. Always use `<Button asChild>` when styling links as buttons.
