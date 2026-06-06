## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2024-05-28 - Explicit aria-describedby for Field hints
**Learning:** The `Field` wrapper component in the Console app visually associated a `hint` with its child input, but screen readers were unable to announce it when the input received focus because there was no semantic association.
**Action:** When creating form field wrappers that include descriptive helper text, dynamically generate an ID for the hint element and inject it into the child input's `aria-describedby` prop (preserving any existing values).
