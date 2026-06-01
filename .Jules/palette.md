## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-06-01 - Automatic Accessible Field Hints
**Learning:** The `Field` wrapper component visually associates hints with inputs, but screen readers miss this context if developers forget to manually link them. Providing automatic `id` generation and `aria-describedby` mapping at the design system level creates guaranteed screen reader accessibility without requiring explicit assignment per-field by consumers.
**Action:** When creating wrapper components (like `Field` or `FormItem`), generate unique IDs internally with `useId()` and inject them into child `aria-describedby` attributes via `React.cloneElement`, ensuring any existing aria-describedby values are preserved.
