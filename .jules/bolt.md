## YYYY-MM-DD - Avoid Math.max with spread operator for performance
**Learning:** Using Math.max(...array) on arrays creates an intermediate array allocation (from spread syntax) and can lead to maximum call stack exceeded errors on large arrays, while also performing poorly.
**Action:** Use a simple reduce function to calculate max array values in performance-critical chart renderers (like `apps/console/src/components/console/charts.tsx` and `apps/console/src/app/(console)/dashboard/page.tsx`).
