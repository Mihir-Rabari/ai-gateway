## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-06-06 - Dynamic Accessible Hints for Wrapper Components
**Learning:** React components that wrap inputs (like `Field`) often add visual text (e.g. `hint` descriptions) next to the inputs but miss connecting them logically for screen readers. Simply assigning `id` and `htmlFor` handles `<label>` associations, but `<span id="hint">...</span>` text isn't announced when focusing the input unless explicitly connected via `aria-describedby`.
**Action:** Use `useId()` in wrapper components to generate an ID for auxiliary text and inject it into the child input via `React.cloneElement` on the `aria-describedby` prop. Ensure existing `aria-describedby` props are preserved (appended space-separated) to maintain any other descriptions.
