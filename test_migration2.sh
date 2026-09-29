node -e "
const fs = require('fs');
['apps/worker', 'apps/routing-service', 'apps/gateway', 'apps/credit-service', 'apps/billing-service', 'apps/analytics-service'].forEach(pkg => {
  const file = pkg + '/package.json';
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (data.scripts && data.scripts.test) {
    if (pkg === 'apps/routing-service') {
      data.scripts.test = 'tsx --test src/__tests__/*.test.ts';
    } else if (pkg === 'apps/worker') {
      data.scripts.test = 'tsx --test src/__tests__/*.test.ts';
    } else if (pkg === 'apps/gateway') {
      data.scripts.test = 'tsx --test src/__tests__/*.test.ts';
    } else if (pkg === 'apps/credit-service') {
      data.scripts.test = 'tsx --test src/__tests__/*.test.ts';
      if (data.scripts['test:integration']) {
        data.scripts['test:integration'] = 'tsx --test src/__tests__/*.integration.test.ts';
      }
    } else if (pkg === 'apps/billing-service') {
      data.scripts.test = 'tsx --test src/__tests__/*.test.ts';
    } else if (pkg === 'apps/analytics-service') {
      data.scripts.test = 'tsx --test src/__tests__/*.test.ts';
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  }
});
"
