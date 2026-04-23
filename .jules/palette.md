## 2026-04-19 - [Fixing button nesting accessibility issue]
**Learning:** In Next.js, wrapping a local `<Button>` component (which renders a `<button>`) inside a `<Link>` component produces invalid HTML5 (a button inside an anchor) and causes screen reader accessibility issues. Because the `Button` component doesn't support the Radix `asChild` pattern, the correct approach is to remove the `<Button>` and apply its styles directly to the `<Link>` tag.
**Action:** Replace `<Link><Button>...</Button></Link>` with `<Link className="[button classes]">...</Link>` across the codebase.
