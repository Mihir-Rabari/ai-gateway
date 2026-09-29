node -e "
const fs = require('fs');

['apps/worker', 'apps/routing-service', 'apps/gateway', 'apps/credit-service', 'apps/billing-service', 'apps/analytics-service'].forEach(pkg => {
  const file = pkg + '/package.json';
  if(fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));

      if (data.scripts && data.scripts.test) {
        data.scripts.test = 'pnpm build && node --experimental-test-isolation=none --test dist/__tests__';
        fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
      }
  }
});
"
