node -e "
const fs = require('fs');
['apps/worker', 'apps/routing-service', 'apps/gateway', 'apps/credit-service', 'apps/billing-service', 'apps/analytics-service'].forEach(pkg => {
  const file = pkg + '/package.json';
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (data.scripts && data.scripts.test) {
    data.scripts.test = data.scripts.test.replace('tsx --test ', 'node --experimental-test-isolation=none --test dist/__tests__/*.test.js ');
    data.scripts.test = data.scripts.test.replace('src/__tests__/*.test.ts', '');
    if(data.scripts['test:integration']){
        data.scripts['test:integration'] = data.scripts['test:integration'].replace('tsx --test ', 'pnpm build && node --experimental-test-isolation=none --test dist/__tests__/*.integration.test.js ');
        data.scripts['test:integration'] = data.scripts['test:integration'].replace('src/__tests__/*.integration.test.ts', '');
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  }
});
"
