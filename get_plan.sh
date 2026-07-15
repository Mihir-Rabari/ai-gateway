echo "1. Modify \`apps/api/src/services/AppService.ts\` to use \`Promise.all\` for the two \`bcrypt.hash\` calls in \`registerApp\` to compute them in parallel, reducing the total latency."
echo "2. Run formatting and linting for \`apps/api\`."
echo "3. Run tests for \`apps/api\` to verify no functionality is broken."
