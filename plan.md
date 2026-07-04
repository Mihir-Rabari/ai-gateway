1. **Identify the UX/accessibility issue:**
   The raw `<button>` elements used for icon-only actions (like "Copy", "Show/Hide") in `apps/console/src/app/(console)/apps/[id]/page.tsx` and `apps/console/src/app/(console)/apps/new/page.tsx` lack `aria-label`s for screen readers and `focus-visible` styling for keyboard accessibility. This violates accessibility guidelines.
   Specifically:
   - In `apps/[id]/page.tsx`, the copy buttons for App ID, Client ID, and API Key, and the show/hide button for API Key.
   - In `apps/new/page.tsx`, the show/hide and copy buttons in the `CopyField` component.

2. **Implement the fix:**
   I will use `replace_with_git_merge_diff` to add `aria-label` attributes and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700` classes to these specific `<button>` elements.

3. **Verify the fix:**
   - I will run `pnpm --filter console lint` and `pnpm --filter console type-check` to ensure there are no syntax or type errors.
   - I will use `frontend_verification_instructions` to visually verify the changes.
   - I will check the file contents using `cat` to ensure the replacements were applied correctly.

4. **Complete pre-commit steps:**
   Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

5. **Submit the change:**
   I will submit the PR with the title "🎨 Palette: Add accessibility to icon-only buttons" and the required description format.
