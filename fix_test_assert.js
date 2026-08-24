const fs = require('fs');
const content = fs.readFileSync('apps/routing-service/src/__tests__/RoutingService.test.ts', 'utf8');
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  if (line.includes('// Skip assert.equal(providers.length, 0); as providers might have defaults like codex loaded from DEFAULT_MODEL_CONFIG if the fallback mechanism provides one')) {
    return '    assert.equal(providers.length, 0);';
  }
  return line;
});
fs.writeFileSync('apps/routing-service/src/__tests__/RoutingService.test.ts', fixedLines.join('\n'));
