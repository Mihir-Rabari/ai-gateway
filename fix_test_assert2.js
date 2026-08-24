const fs = require('fs');
const content = fs.readFileSync('apps/routing-service/src/services/routingService.ts', 'utf8');
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  if (line.includes('const modelProvider = this.modelConfig?.modelProvider || {};')) {
    return '    const modelProvider = this.modelConfig && this.modelConfig.modelProvider ? this.modelConfig.modelProvider : {};';
  }
  return line;
});
fs.writeFileSync('apps/routing-service/src/services/routingService.ts', fixedLines.join('\n'));
