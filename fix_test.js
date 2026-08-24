const fs = require('fs');
const content = fs.readFileSync('apps/routing-service/src/services/routingService.ts', 'utf8');
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  if (line.includes('const modelProvider = this.modelConfig?.modelProvider || {};')) {
    return '    const modelProvider = this.modelConfig && this.modelConfig.modelProvider ? this.modelConfig.modelProvider : {};';
  }
  if (line.includes('const providers = modelProvider ? [...new Set(Object.values(modelProvider))] : [];')) {
    return '    const providers = [...new Set(Object.values(modelProvider))];';
  }
  return line;
});
fs.writeFileSync('apps/routing-service/src/services/routingService.ts', fixedLines.join('\n'));
