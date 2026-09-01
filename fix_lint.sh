#!/bin/bash
sed -i 's/\/\/ One endpoint — any model/{"\/\/ One endpoint — any model"}/g' apps/web/src/app/page.tsx
sed -i 's/\/\/ via OpenAI/{"\/\/ via OpenAI"}/g' apps/web/src/app/page.tsx
sed -i 's/\/\/ 1 credit deducted/{"\/\/ 1 credit deducted"}/g' apps/web/src/app/page.tsx
sed -i 's/\/\/ ↳ Auto-routed to cheapest provider/{"\/\/ ↳ Auto-routed to cheapest provider"}/g' apps/web/src/app/page.tsx
sed -i 's/"as is"/\&quot;as is\&quot;/g' apps/web/src/app/terms/page.tsx
