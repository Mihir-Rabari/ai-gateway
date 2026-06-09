## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2026-06-09 - Ensure explicit aria-describedby for Field hints
**Learning:** React wrapper components (like `Field`) that render descriptive hints alongside child inputs fail to associate the hint with the input for screen readers unless `aria-describedby` is explicitly managed.
**Action:** Use `React.useId()` to generate dynamic IDs for hint text elements and inject them into the child input's `aria-describedby` attribute via `React.cloneElement`, ensuring seamless screen reader accessibility without requiring manual ID assignment from developers.
