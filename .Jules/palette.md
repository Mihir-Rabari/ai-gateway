## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2024-06-07 - Add aria-describedby to wrapper components
**Learning:** React elements wrapped in a layout component (like `Field`) with adjacent helper text lack an implicit screen reader association with that text.
**Action:** Always inject `id` and `aria-describedby` into child interactive elements using `useId()` and `React.cloneElement` in wrapper components to ensure screen readers announce the helper text upon focus.
