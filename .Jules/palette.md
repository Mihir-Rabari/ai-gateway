## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2026-06-04 - Add aria-describedby for Field hints
**Learning:** In reusable form field wrappers that render both a label and a hint/description next to an input child, screen readers often fail to announce the hint unless it is explicitly associated with the input. While `htmlFor` handles labels, `aria-describedby` must be used for hints.
**Action:** Use `useId()` to generate unique IDs and `React.cloneElement` to dynamically attach both the `id` (for the label) and `aria-describedby` (for the hint) to the wrapped child input. Ensure existing `aria-describedby` props on the child are preserved and appended to.
## 2024-06-16 - Do not duplicate aria-label and sr-only text
**Learning:** Adding an `aria-label` to an icon-only button that already contains an inner `<span className="sr-only">` is an accessibility anti-pattern. Screen readers will read the `aria-label` and completely ignore the inner text, making the `sr-only` span dead code.
**Action:** When improving accessibility for icon-only buttons, either add a `title` attribute for sighted users and leave the existing `sr-only` text alone, or update the `sr-only` text itself if better context is needed. Do not use both on the same element.

## 2024-05-27 - Toaster accessibility enhancements
**Learning:** When implementing or modifying dynamic notification components (e.g., Toasters), it is crucial to ensure they are accessible to screen readers. Standard visual feedback is not enough for users relying on assistive technologies to understand that a notification has appeared or to locate it.
**Action:** Always ensure the main container uses `role="region"` and an `aria-label` (e.g., 'Notifications'), and that individual notification elements use `role="status"` or `role="alert"` (for destructive variants) with an appropriate `aria-live` attribute (`polite` for standard, `assertive` for destructive errors) to guarantee screen reader accessibility.
## 2024-06-23 - Add ARIA live attributes to InlineMessage
**Learning:** Found an app-specific pattern where `InlineMessage` component (used for backend error messages, such as those from invalid forms) is not read by screen readers immediately, missing `role="alert"` and `aria-live="assertive"` attributes.
**Action:** Always ensure dynamic notification components like inline error states are wrapped in an element with `role="alert"` and `aria-live="assertive"` (or `status`/`polite` for non-errors) to guarantee screen reader accessibility.
