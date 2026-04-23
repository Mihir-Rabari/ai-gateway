## 2024-03-24 - [Invalid HTML Structure in Console App Links]
 **Learning:** The Next.js frontend has a recurring accessibility issue where `<Button>` components are nested inside `<Link>` or `<a>` tags (e.g., `<Link href="..."><Button>...</Button></Link>`). This is invalid HTML5, creates redundant tab stops, and confuses screen readers.
 **Action:** Refactor invalid `<Link><Button/></Link>` patterns by applying the Button component's visual styling (via a CSS-based button or utility classes) directly to the `<Link>` element, or by ensuring custom `<Button>` components use an `asChild` prop or forward props correctly.

## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.
