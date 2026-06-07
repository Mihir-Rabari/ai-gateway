## 2024-05-27 - Loading state implementation differs across workspaces
**Learning:** The `console` app implements an elegant built-in `busy={true}` prop on its Button component which automatically handles the loading spinner. The `web` app uses standard shadcn-style Buttons which lack this internal state, leading to inconsistent async UX where forms freeze without visual feedback.
**Action:** When working in `apps/web`, always manually compose `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` inside `<Button>` for async forms to match the perceived performance of the console app.

## 2024-06-07 - Add `aria-describedby` to Field wrapper
**Learning:** React wrapper components (like `Field`) that enclose accessible child inputs may fail to map descriptive text correctly if attributes aren't forwarded.
**Action:** Use `React.cloneElement` to dynamically inject accessibility attributes (`aria-describedby`) into wrapper component children (combining existing values if present) while ensuring the child prop type includes the injected attributes (e.g., `children: React.ReactElement<{ id?: string; 'aria-describedby'?: string }>`) to satisfy TypeScript.
