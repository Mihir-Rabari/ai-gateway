const fs = require('fs');

const pageFile = 'apps/web/src/app/page.tsx';
let pageContent = fs.readFileSync(pageFile, 'utf8');

pageContent = pageContent.replace(/<div className="text-zinc-500">\/\/ One endpoint — any model<\/div>/g, '<div className="text-zinc-500">{"// One endpoint — any model"}</div>');
pageContent = pageContent.replace(/<div className="text-zinc-500">\/\/ ↳ Auto-routed to cheapest provider<\/div>/g, '<div className="text-zinc-500">{"// ↳ Auto-routed to cheapest provider"}</div>');
pageContent = pageContent.replace(/<span className="text-zinc-600">\/\/ via OpenAI<\/span>/g, '<span className="text-zinc-600">{"// via OpenAI"}</span>');
pageContent = pageContent.replace(/<span className="text-zinc-600">\/\/ 1 credit deducted<\/span>/g, '<span className="text-zinc-600">{"// 1 credit deducted"}</span>');

fs.writeFileSync(pageFile, pageContent);

const termsFile = 'apps/web/src/app/terms/page.tsx';
let termsContent = fs.readFileSync(termsFile, 'utf8');
termsContent = termsContent.replace(/to \("Services"\)/g, 'to (&quot;Services&quot;)');
fs.writeFileSync(termsFile, termsContent);
