// PM2 Ecosystem Configuration
// Usage:
//   Development:  pnpm pm2:dev
//   Production:   pnpm pm2:start
//   Stop all:     pnpm pm2:stop
//   Delete all:   pnpm pm2:delete
//   Logs:         pnpm pm2:logs

const isDev = process.env.NODE_ENV !== "production";

const BACKEND_PROD_ENTRY = "dist/index.js";

const backendServices = [
  "api",
  "gateway",
  "auth-service",
  "billing-service",
  "credit-service",
  "routing-service",
  "analytics-service",
  "worker",
].map((name) => ({
  name,
  cwd: `./apps/${name}`,
  script: isDev ? "pnpm" : "node",
  args: isDev ? "dev" : BACKEND_PROD_ENTRY,
  watch: false,
  env: { NODE_ENV: "development" },
  env_production: { NODE_ENV: "production" },
}));

const frontendApps = [
  {
    name: "web",
    cwd: "./apps/web",
    script: "pnpm",
    args: isDev ? "dev" : "start",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "console",
    cwd: "./apps/console",
    script: "pnpm",
    args: isDev ? "dev" : "start",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
];

module.exports = {
  apps: [...backendServices, ...frontendApps],
};
