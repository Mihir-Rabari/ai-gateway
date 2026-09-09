const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix react/jsx-no-comment-textnodes
  content = content.replace(/{\/\* \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- \*\/}/g, "{/* ------------------------------ */}"); // Replace existing with itself to normalize
  content = content.replace(/\/\/ ------------------------------/g, "{'// ------------------------------'}");

  // Fix unescaped entities
  content = content.replace(/"/g, '&quot;');
  // But don't mess up JS strings or React props
  // We'll just do manual fixes for the ones reported:
  // ./src/app/terms/page.tsx:39:81

  fs.writeFileSync(file, content);
}

// Just apply to the specific files reported
const pageFile = 'apps/web/src/app/page.tsx';
let pageContent = fs.readFileSync(pageFile, 'utf8');
pageContent = pageContent.replace(/\/\/ ------------------------------/g, "{'// ------------------------------'}");
fs.writeFileSync(pageFile, pageContent);

const termsFile = 'apps/web/src/app/terms/page.tsx';
let termsContent = fs.readFileSync(termsFile, 'utf8');
termsContent = termsContent.replace(/to \("Services"\)/g, 'to (&quot;Services&quot;)');
fs.writeFileSync(termsFile, termsContent);
