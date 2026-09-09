const fs = require('fs');

const termsFile = 'apps/web/src/app/terms/page.tsx';
let termsContent = fs.readFileSync(termsFile, 'utf8');
termsContent = termsContent.replace(/"as is"/g, '&quot;as is&quot;');
fs.writeFileSync(termsFile, termsContent);
