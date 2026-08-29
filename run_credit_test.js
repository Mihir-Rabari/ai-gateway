const { execSync } = require('child_process');
try {
  execSync('vitest run --pool=threads src/__tests__/credit.test.ts', { stdio: 'inherit', cwd: 'apps/credit-service' });
} catch (e) {
  process.exit(1);
}
