## 2026-04-12 - Missing ARIA Labels on Ad-Hoc Icon Buttons
**Learning:** In the developer console UI (`apps/console`), there is a pattern of using inline, ad-hoc `<button>` elements rather than standard design system components for small actions like the password visibility toggle (`Eye`/`EyeOff`). These ad-hoc buttons often lack critical accessibility attributes such as `aria-label` or `title`, and sometimes miss focus-visible states for keyboard users.
**Action:** Always verify small interactive elements (especially icon-only buttons) for proper aria-labels and keyboard focus indicators, and consider standardizing them into a reusable `<IconButton />` component in the future to prevent regressions.
## 2026-04-22 - Reusable IconButton component
**Learning:** We refactored ad-hoc icon-only buttons to use a standard reusable `<IconButton>` component. By making `aria-label` a required prop in the TypeScript definition of `<IconButton>`, we statically enforce accessibility for all future icon buttons added to the console UI. The component also gracefully falls back to using the `aria-label` as the `title` tooltip if no explicit `title` is provided, further improving UX.
**Action:** Use the `<IconButton>` component from `system.tsx` for any new icon-only buttons to ensure they are accessible by default.

## 2026-05-03 - Button asChild and Accessible Links
**Learning:** Wrapping a `<Button>` (that renders a `<button>`) inside an `<a>` or Next.js `<Link>` tag creates invalid HTML5 and screen reader accessibility issues. However, manually duplicating Tailwind button classes onto Links makes the code hard to maintain.
**Action:** Implemented Radix UI's `Slot` utility via an `asChild` prop on the `Button` component, combining it with `<Slottable>` to correctly preserve loading indicators while making it easy to render semantic links natively like `<Button asChild><Link href="...">...</Link></Button>`.

## 2026-05-05 - Accessible External Links and Button Semantics
**Learning:** External links on landing and login pages were missing target="_blank", rel="noopener noreferrer", and keyboard focus-visible states. Additionally, <Link><Button>...</Button></Link> patterns were still present, creating invalid HTML5.
**Action:** Updated landing page and login page to use <Button asChild><Link>/<Button asChild><a>, and added proper focus indicators and secure external link attributes.

## 2024-05-09 - Explicit Form Labels
**Learning:** Form components leveraging the `<Field>` wrapper were implicitly associating labels by wrapping inputs in `<label>` tags. While technically valid HTML5, providing explicit `htmlFor` associations on labels matched with input `id` attributes ensures better support across a wider range of screen readers and assistive technologies.
**Action:** Add `htmlFor` props to wrapper components and ensure all corresponding inner `<input>` or `<textarea>` elements receive matching `id` attributes.
