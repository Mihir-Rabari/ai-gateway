## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2024-05-28 - Explicit hint associations in generic form wrappers
**Learning:** In custom component wrappers like the `Field` component (which automatically handles labels and hints for inputs), implicitly displaying descriptive text next to an input is insufficient for screen readers. The hint must be programmatically linked to the input.
**Action:** Always generate a dynamic ID for the hint text and append it to the child input's `aria-describedby` prop, taking care to preserve any existing values in that prop to avoid overwriting developer-defined accessibility attributes.
