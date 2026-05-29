## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.
## 2024-05-29 - ToastClose icon button lacks aria-label
**Learning:** The `ToastClose` component built with Radix UI in `apps/web/src/components/ui/toast.tsx` defaults to an `<X />` icon without an explicit accessible label, which is opaque to screen readers.
**Action:** When adding or auditing icon-only utility components (like dismiss/close buttons or standard `<X />` icons), ensure `aria-label` (and `title` for hover tooltips) is manually added to the wrapping component.
