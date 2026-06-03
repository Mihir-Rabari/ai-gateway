## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-05-27 - Map wrapper component hints to input via aria-describedby
**Learning:** When using wrapper components like `Field` that render explanatory hint text alongside an input, screen readers do not automatically associate the hint text with the input field. The ID linking must be explicit.
**Action:** Always generate a unique ID for the hint text element and use `React.cloneElement` to dynamically inject that ID into the child input's `aria-describedby` prop (preserving any pre-existing values) to guarantee proper screen reader announcements.
