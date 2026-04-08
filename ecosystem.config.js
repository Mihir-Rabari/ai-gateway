// PM2 Ecosystem Configuration
// Usage:
//   Development:  pnpm pm2:dev
//   Production:   pnpm pm2:start
//   Stop all:     pnpm pm2:stop
//   Delete all:   pnpm pm2:delete
//   Logs:         pnpm pm2:logs

const isDev = process.env.NODE_ENV !== "production";

const backendServices = [
  {
    name: "api",
    cwd: "./apps/api",
    script: isDev ? "pnpm" : "node",
    args: isDev ? "dev" : "dist/index.js",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "gateway",
    cwd: "./apps/gateway",
    script: isDev ? "pnpm" : "node",
    args: isDev ? "dev" : "dist/index.js",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "auth-service",
    cwd: "./apps/auth-service",
    script: isDev ? "pnpm" : "node",
    args: isDev ? "dev" : "dist/index.js",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "billing-service",
    cwd: "./apps/billing-service",
    script: isDev ? "pnpm" : "node",
    args: isDev ? "dev" : "dist/index.js",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "credit-service",
    cwd: "./apps/credit-service",
    script: isDev ? "pnpm" : "node",
    args: isDev ? "dev" : "dist/index.js",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "routing-service",
    cwd: "./apps/routing-service",
    script: isDev ? "pnpm" : "node",
    args: isDev ? "dev" : "dist/index.js",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "analytics-service",
    cwd: "./apps/analytics-service",
    script: isDev ? "pnpm" : "node",
    args: isDev ? "dev" : "dist/index.js",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "worker",
    cwd: "./apps/worker",
    script: isDev ? "pnpm" : "node",
    args: isDev ? "dev" : "dist/index.js",
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
];

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
