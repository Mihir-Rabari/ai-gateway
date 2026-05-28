## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2024-05-28 - Missing disabled states on specialized UI components
**Learning:** Shared UI components in the design system, specifically the `IconButton`, can sometimes lack standard accessible disabled states (`disabled:opacity-55 disabled:cursor-not-allowed`) even when regular buttons in the same system include them. This inconsistency degrades UX for inactive actions.
**Action:** Always verify that custom interactive elements inherited from standard HTML primitives propagate and visually represent standard states like `disabled` and keyboard focus indicators using appropriate utility classes.
