import fs from 'fs';
import { execSync } from 'child_process';

const files = execSync('git ls-files "**/package.json" "package.json"').toString().split('\n').filter(Boolean);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const pkg = JSON.parse(content);
  pkg.version = '0.0.3';
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Bumped ${file} to 0.0.3`);
});
