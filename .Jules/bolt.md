
## 2026-10-20 - Array Spread O(N) Overhead in React Renders
**Learning:** Found usage of `Math.max(...array)` and `Math.max(...array.map(fn))` in dashboard rendering paths which creates intermediate array allocations and incurs spread operator overhead per render, risking "Maximum call stack size exceeded" on large data sets.
**Action:** Replace `Math.max(...array.map(fn))` and `Math.max(...array)` with a single pass `.reduce()` to bypass intermediate allocations and spread operator overhead for data points mapped in rendering paths.

## 2026-10-20 - CI Testing Configuration Warning
**Learning:** In this monorepo, running the workspace-wide `pnpm test` may fail due to incorrect pre-existing test scripts looking for compiled tests in `dist/__tests__` (which are excluded by `tsconfig.json`). Attempting to "fix" the CI by updating `package.json` test scripts across the workspace is a boundary violation and causes further CI confusion.
**Action:** Do not attempt to fix unrelated package test failures or modify `package.json` / `tsconfig.json` scripts without explicit instruction. Rely on localized test verification for your specific changes and use `git restore` to discard unintended modifications before submission.
