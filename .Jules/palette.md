## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-06-08 - Missing disabled styling on base custom components
**Learning:** Standard interactive components built without Radix or base libraries (like `IconButton` in the console app) often lack default disabled stylings (`disabled:opacity-55 disabled:cursor-not-allowed`), preventing consistent visual feedback when actions are unavailable.
**Action:** Always ensure all custom interactive elements include explicitly defined disabled states alongside focus indicators.
