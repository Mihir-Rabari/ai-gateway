## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-06-04 - Screen reader accessibility for Field wrapper hints
**Learning:** The custom `Field` wrapper component in the Console app (`apps/console/src/components/console/system.tsx`) visually displayed hint text but did not programmatically associate it with the wrapped form input, making the hint invisible to screen readers when the input receives focus.
**Action:** Use `React.cloneElement` in wrapper components to dynamically inject a generated `aria-describedby` attribute pointing to the hint's ID. To prevent breaking existing accessibility, always safely append the new ID to any existing `aria-describedby` prop on the child element by joining them into a space-separated string.
