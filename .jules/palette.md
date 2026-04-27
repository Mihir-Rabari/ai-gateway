
## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.

## 2026-04-22 - Replacing Text-based Toggles with Accessible Icons
**Learning:** Raw text-based mobile menu toggle buttons (e.g., "x" or "menu") provide poor visual affordance and lack explicit accessibility attributes.
**Action:** Replace text-based toggles with standard `lucide-react` icons (like `Menu` and `X`) and ensure they include `aria-label` and `title` attributes along with strong focus-visible ring styles for improved keyboard navigation and a polished UX.
