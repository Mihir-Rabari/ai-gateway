import fs from 'fs';
let content = fs.readFileSync('apps/routing-service/src/__tests__/RoutingService.test.ts', 'utf8');

content = content.replace(
  'createRedisMock(),\n      {},',
  'createRedisMock() as any,\n      {},\n      { modelProvider: {} } as any'
);

fs.writeFileSync('apps/routing-service/src/__tests__/RoutingService.test.ts', content);
