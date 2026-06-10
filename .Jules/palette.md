## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-05-27 - Form hint accessibility via aria-describedby
**Learning:** Reusable React wrapper components (like `Field`) that wrap unstyled input elements must explicitly map their descriptive helper text (`hint`) to the child input's `aria-describedby` attribute to ensure screen readers announce the hint when the input receives focus.
**Action:** When implementing wrapper components, use `React.cloneElement` to dynamically append a generated `id` from the hint element to the child's `aria-describedby` prop, taking care to preserve any existing `aria-describedby` values the child might already possess.
