## 2026-04-12 - Missing ARIA Labels on Ad-Hoc Icon Buttons
**Learning:** In the developer console UI (`apps/console`), there is a pattern of using inline, ad-hoc `<button>` elements rather than standard design system components for small actions like the password visibility toggle (`Eye`/`EyeOff`). These ad-hoc buttons often lack critical accessibility attributes such as `aria-label` or `title`, and sometimes miss focus-visible states for keyboard users.
**Action:** Always verify small interactive elements (especially icon-only buttons) for proper aria-labels and keyboard focus indicators, and consider standardizing them into a reusable `<IconButton />` component in the future to prevent regressions.

## 2026-04-22 - Reusable IconButton component
**Learning:** We refactored ad-hoc icon-only buttons to use a standard reusable `<IconButton>` component. By making `aria-label` a required prop in the TypeScript definition of `<IconButton>`, we statically enforce accessibility for all future icon buttons added to the console UI. The component also gracefully falls back to using the `aria-label` as the `title` tooltip if no explicit `title` is provided, further improving UX.
**Action:** Use the `<IconButton>` component from `system.tsx` for any new icon-only buttons to ensure they are accessible by default.

## 2024-05-03 - [UI improvement] Add Radix UI asChild to Button
**Learning:** Nesting buttons inside links is invalid HTML. Duplicating tailwind classes on links to make them look like buttons is a maintenance nightmare.
**Action:** Implemented the asChild pattern using Radix Slot. This allows Link components to render as semantic <a> tags while inheriting all the Button component's visual styling and behavior.

## 2024-04-24 - Improve external link accessibility and security
**Learning:** External links should always use noopener noreferrer for security and have clear focus indicators for accessibility.
**Action:** Added target="_blank", rel="noopener noreferrer", and focus-visible classes to the external website link in the console shell.
## 2024-04-30 - [UX improvement] Add keyboard focus indicators to console shell
**Learning:** Keyboard users need a clear visual indication of which navigation element is currently focused.
**Action:** Added focus-visible:ring-2 to all navigation links in the console shell, ensuring consistent keyboard accessibility across the platform.

## 2024-05-04 - Fix invalid HTML button nesting and enhance link accessibility
**Learning:** React/Next.js applications frequently suffer from invalid HTML nesting and lack of keyboard accessibility on non-button links. Specifically, nesting a custom `<Button>` inside an `<a>` or Next.js `<Link>` element causes invalid DOM hierarchy and screen reader issues. Additionally, manually styled links often omit standard `:focus-visible` styling (like `focus-visible:ring-2`), creating an inconsistent keyboard navigation experience.
**Action:** Always employ Radix UI's `Slot` (`asChild` pattern) when rendering link behaviors onto `<Button>` components (`<Button asChild><Link href="...">Text</Link></Button>`). Additionally, ensure all interactive elements styled like text or secondary links (e.g., "Create account" or "Back to landing") include explicit `focus-visible` states to preserve proper keyboard navigation, and add `target="_blank"` and `rel="noopener noreferrer"` to external links.

## 2024-05-21 - [Accessibility improvement] Use explicit labels
**Learning:** Implicit label wrapping (nesting input inside label) can cause issues with some screen readers or complex nested components. Explicit `htmlFor` associations are more robust.
**Action:** Always use explicit `<label htmlFor="id">` associations with matching `<input id="id">` instead of implicit wrapping.
