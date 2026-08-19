# Fix test script to use tsx directly on source files for packages where tsconfig excludes __tests__
pnpm --filter @ai-gateway/routing-service pkg set scripts.test="tsx --test src/__tests__/RoutingService.test.ts src/__tests__/validateModelConfig.test.ts"
