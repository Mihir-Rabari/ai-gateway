const fs = require('fs');
let terms = fs.readFileSync('apps/web/src/app/terms/page.tsx', 'utf8');
terms = terms.replace(
  `AI Gateway is provided "as is" without warranties of any kind.`,
  `AI Gateway is provided &quot;as is&quot; without warranties of any kind.`
);
fs.writeFileSync('apps/web/src/app/terms/page.tsx', terms, 'utf8');
