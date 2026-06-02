## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-05-27 - Form accessibility in wrapper components
**Learning:** In standard React form wrapper components (like `Field`), simply placing a hint text visually near an input is insufficient for screen readers. The wrapper must explicitly establish the relationship.
**Action:** When implementing wrapper components that provide descriptive text or hints to inputs, always generate a dynamic ID for the hint text and append it to the child input's `aria-describedby` prop (using `React.cloneElement` while preserving any existing values) to guarantee screen reader accessibility.
