## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-05-27 - Form Field Accessibility via aria-describedby
**Learning:** In the `console` app, the `Field` wrapper component used to render forms provides optional `hint` text below inputs, but this text was only visually associated, making it invisible to screen reader users focused on the input.
**Action:** When creating form wrappers that display supplementary hint or error text, always dynamically generate an ID for the text element and programmatically map it to the child input using `React.cloneElement` to inject the `aria-describedby` attribute, taking care to preserve any pre-existing values.
