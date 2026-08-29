sed -i 's/"test": "pnpm build && node --experimental-test-isolation=none --test dist\/__tests__\/handlers.test.js"/"test": "tsx --test src\/__tests__\/*.test.ts"/g' apps/worker/package.json
