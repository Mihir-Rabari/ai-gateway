## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2026-06-06 - Dynamic aria-describedby generation
**Learning:** When using React.cloneElement to inject accessibility attributes into children, ensure the TypeScript type for children is updated to accept the new attributes to prevent compilation errors.
**Action:** Update the child ReactElement type to accept any dynamically injected props like 'aria-describedby'.
