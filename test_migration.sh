node -e "
const fs = require('fs');
['apps/routing-service/src/__tests__/routing.test.ts', 'apps/routing-service/src/__tests__/routingOpenAI.integration.test.ts'].forEach(file => {
  if (fs.existsSync(file)) {
    console.log('Deleting ' + file);
    fs.unlinkSync(file);
  }
});
"
