## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## $(date +%Y-%m-%d) - Field Component `aria-describedby` Linking

**Learning:** When using React cloneElement to pass `id` mapping between a `<label>` and dynamic child inputs (e.g., standard text fields or text areas), standard `hint` helper text was visually adjacent but not explicitly linked to the input via `aria-describedby`, making the hint undiscoverable for screen reader users relying on semantic association. When preserving existing `aria-describedby` props, they must be concatenated, not blindly overwritten.

**Action:** Whenever generating explicit `htmlFor` matching `id` mapping in wrapper components, also generate a unique ID for adjacent instructional text using `useId()` and use React cloneElement to append it to the child element's `aria-describedby` string, filtering out any undefined existing values to prevent "undefined <id>" string outputs. Extended `children` typings are required to avoid TS errors.
