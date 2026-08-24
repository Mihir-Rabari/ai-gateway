const fs = require('fs');
const content = fs.readFileSync('apps/routing-service/src/__tests__/RoutingService.test.ts', 'utf8');
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  if (line.includes('createRedisMock(),')) {
    return '      createRedisMock(),\n      {},\n      { modelProvider: {}, fallbackMap: {} }';
  }
  if (line.includes('{},')) {
    return ''; // We replaced it above
  }
  return line;
});
fs.writeFileSync('apps/routing-service/src/__tests__/RoutingService.test.ts', fixedLines.join('\n'));
