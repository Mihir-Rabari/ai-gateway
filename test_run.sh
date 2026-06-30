cd /app && pnpm --filter gateway exec tsc -p tsconfig.test.json && pnpm --filter gateway test && rm apps/gateway/tsconfig.test.json && (pnpm --filter gateway lint || true)
