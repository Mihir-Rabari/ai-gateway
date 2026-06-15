## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2026-06-04 - Add aria-describedby for Field hints
**Learning:** In reusable form field wrappers that render both a label and a hint/description next to an input child, screen readers often fail to announce the hint unless it is explicitly associated with the input. While `htmlFor` handles labels, `aria-describedby` must be used for hints.
**Action:** Use `useId()` to generate unique IDs and `React.cloneElement` to dynamically attach both the `id` (for the label) and `aria-describedby` (for the hint) to the wrapped child input. Ensure existing `aria-describedby` props on the child are preserved and appended to.
## 2024-06-15 - Dynamic Toasts lacking accessible roles
**Learning:** Dynamic "toast" notifications (like `apps/console/src/components/console/toaster.tsx`) that appear without page reloads are invisible to screen readers unless configured as live regions.
**Action:** When creating or updating dynamic notification components, wrap them in a container with `role="region"` and an `aria-label`, and ensure the individual notification items carry `role="alert"` (for errors) or `role="status"` (for success/info) alongside the corresponding `aria-live` attributes (`assertive` or `polite`).
