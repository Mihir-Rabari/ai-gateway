## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-06-05 - Dynamically linking hints to form inputs
**Learning:** When using wrapper components like `Field` to attach descriptive text (e.g. `hint`) to form inputs, screen readers won't announce the hint when the input is focused unless explicitly linked.
**Action:** Always generate a unique ID for the hint text using `useId()` and append it to the child input's `aria-describedby` prop (preserving any existing values) using `React.cloneElement` to ensure full screen reader compatibility without requiring manual ID assignment by developers.
