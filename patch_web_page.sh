#!/bin/bash
sed -i 's/<div className="text-zinc-500">\/\/ One endpoint — any model<\/div>/<div className="text-zinc-500">{"\/\/ One endpoint \u2014 any model"}<\/div>/g' apps/web/src/app/page.tsx
sed -i 's/<div className="text-zinc-500">\/\/ ↳ Auto-routed to cheapest provider<\/div>/<div className="text-zinc-500">{"\/\/ \u21B3 Auto-routed to cheapest provider"}<\/div>/g' apps/web/src/app/page.tsx
sed -i 's/<span className="text-zinc-600">\/\/ via OpenAI<\/span>/<span className="text-zinc-600">{"\/\/ via OpenAI"}<\/span>/g' apps/web/src/app/page.tsx
sed -i 's/<span className="text-zinc-600">\/\/ 1 credit deducted<\/span>/<span className="text-zinc-600">{"\/\/ 1 credit deducted"}<\/span>/g' apps/web/src/app/page.tsx
