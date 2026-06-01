## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2026-06-01 - Field component accessibility pattern
**Learning:** When creating form wrapper components (like `Field`) that include descriptive text or hints, screen readers won't announce the hint unless it's explicitly associated with the input.
**Action:** Use `useId()` to generate an ID for the hint text and use `React.cloneElement` to dynamically append it to the child input's `aria-describedby` prop, preserving any existing associations.
