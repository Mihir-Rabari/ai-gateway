# Fix test script to use tsx directly on source files for credit-service where tsconfig excludes __tests__
pnpm --filter @ai-gateway/credit-service pkg set scripts.test="tsx --test src/__tests__/creditService.test.ts"
