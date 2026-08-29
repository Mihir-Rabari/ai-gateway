sed -i 's/"test": "node --test --experimental-test-isolation=none dist\/__tests__\/creditService.test.js"/"test": "tsx --test src\/__tests__\/*.test.ts"/g' apps/credit-service/package.json
