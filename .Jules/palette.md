## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-05-28 - Associate wrapper component hints with inputs using aria-describedby
**Learning:** In React wrapper components like `Field` that render a `hint` along with an input, the `hint` is visually associated with the input but not programmatically associated. Screen readers will not announce the hint text when the input is focused unless it's explicitly linked using `aria-describedby`.
**Action:** When creating or modifying wrapper components that add descriptive text to inputs, generate a unique ID using `useId()` for the descriptive text and append it to the child input's `aria-describedby` attribute, being careful to preserve any existing `aria-describedby` values.
