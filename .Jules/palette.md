## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-06-03 - Dynamic aria-describedby for explicit hint associations
**Learning:** The wrapper component `<Field>` in the console app was relying solely on visual proximity to associate hint text with form inputs. Without `aria-describedby` dynamically linking the hint's `id` to the input, screen readers could miss critical context (like formatting rules).
**Action:** When creating form wrappers, always generate a dynamic `id` for hint text using `useId()` and use `React.cloneElement` to append it to the child input's `aria-describedby` prop, taking care to preserve any existing `aria-describedby` values the child may already have.
