#!/bin/bash
# Remove unused variables from web
sed -i 's/useEffect, //g' apps/web/src/app/dashboard/layout.tsx
sed -i 's/, UserProfile//g' apps/web/src/app/dashboard/layout.tsx
sed -i 's/Inter, //g' apps/web/src/app/layout.tsx
sed -i 's/, Terminal//g' apps/web/src/app/page.tsx
sed -i 's/err/ /g' apps/web/src/components/CodexConnect.tsx

# Fix react/jsx-no-comment-textnodes
# wait, actually let's use replace_with_git_merge_diff for the exact errors
