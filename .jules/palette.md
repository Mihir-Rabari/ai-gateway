<<<<<<< HEAD

## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.
=======
## 2026-04-19 - [Fixing button nesting accessibility issue]
**Learning:** In Next.js, wrapping a local `<Button>` component (which renders a `<button>`) inside a `<Link>` component produces invalid HTML5 (a button inside an anchor) and causes screen reader accessibility issues. Because the `Button` component doesn't support the Radix `asChild` pattern, the correct approach is to remove the `<Button>` and apply its styles directly to the `<Link>` tag.
**Action:** Replace `<Link><Button>...</Button></Link>` with `<Link className="[button classes]">...</Link>` across the codebase.
>>>>>>> 8160111 (Save local changes)
