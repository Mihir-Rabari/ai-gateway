const fs = require('fs');
let chat = fs.readFileSync('apps/api/src/routes/v1/chat.ts', 'utf8');
chat = chat.replace("      req.log.error({ err }, 'Failed to process chat request');\n      console.error(`[API Trace] Chat request failed:`, err);", "      req.log.error({ err }, 'Failed to process chat request');");
fs.writeFileSync('apps/api/src/routes/v1/chat.ts', chat);
