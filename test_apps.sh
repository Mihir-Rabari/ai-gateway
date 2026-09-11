#!/bin/bash
set -e
pnpm dlx tsx --test apps/analytics-service/src/__tests__/usageBatch.test.ts
pnpm dlx tsx --test apps/billing-service/src/__tests__/*.test.ts
pnpm dlx tsx --test apps/credit-service/src/__tests__/creditService.test.ts
pnpm dlx tsx --test apps/worker/src/__tests__/handlers.test.ts
pnpm dlx tsx --test packages/sdk-js/*.test.ts
cd apps/auth-service && pnpm test
