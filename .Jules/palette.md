## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2024-06-07 - Accessible hints in generic wrapper components
**Learning:** Reusable React wrapper components (like `Field`) that render descriptive `<label>` and `hint` elements adjacent to a `<children>` input element will visually indicate context, but screen readers will not announce the hint text on input focus unless it is explicitly associated.
**Action:** Always generate a dynamic ID for the hint text and use `React.cloneElement` to inject it into the cloned child's `aria-describedby` prop, while preserving any existing `aria-describedby` values the child may already have.
