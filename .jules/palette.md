
## 2026-04-22 - Invalid Button nesting inside Next.js Links
**Learning:** Wrapping a custom `<Button>` component inside a Next.js `<Link>` or standard `<a>` tag creates invalid HTML5 (a button cannot be a child of an anchor) and causes significant screen reader accessibility issues. In `apps/console`, this pattern was previously used to create link buttons.
**Action:** Replace the invalid nesting pattern by applying the custom Button's exact Tailwind utility classes directly to the `<Link>` or `<a>` component, eliminating the nested `<Button>` entirely.
## 2024-04-30 - Focus styles and external link behaviors in Console Shell
**Learning:** The console application's side/top navigation links and external link tags were missing essential standard behaviors like focus rings (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`) and external link security/accessibility attributes (`target="_blank" rel="noopener noreferrer"`).
**Action:** When adding links in the design system, always ensure proper keyboard accessibility indicators are present and external links follow secure opening behaviors.
