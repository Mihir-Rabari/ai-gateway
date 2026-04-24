
## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.
## 2026-04-23 - External link attributes
**Learning:** External links (e.g., `<a>` tags pointing to URLs outside the app) must include `target="_blank"` and `rel="noopener noreferrer"` for standard UX and security best practices, along with appropriate `focus-visible` accessibility styles.
**Action:** Always add `target="_blank"`, `rel="noopener noreferrer"`, and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50` when creating or modifying external links.
