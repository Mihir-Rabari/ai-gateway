## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-05-28 - Associate hint text with input in `Field`
**Learning:** Screen readers won't announce the hint text (e.g. "One per line") associated with an input unless explicitly linked.
**Action:** When creating a wrapper component that renders both an input and descriptive text (like `Field`), dynamically generate an `id` for the hint and pass it to the child input's `aria-describedby` prop (preserving existing values) so the context is read automatically.
