// PM2 Ecosystem Configuration
// Usage:
//   Development:  pnpm pm2:dev
//   Production:   pnpm pm2:start
//   Stop all:     pnpm pm2:stop
//   Delete all:   pnpm pm2:delete
//   Logs:         pnpm pm2:logs

const isDev = process.env.NODE_ENV !== "production";
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

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
  // In dev on Windows spawn cmd.exe to run pnpm.cmd. On Unix call pnpm directly.
  script: isDev
    ? (process.platform === "win32" ? "cmd" : pnpmCmd)
    : "node",
  args: isDev
    ? (process.platform === "win32" ? ["/c", pnpmCmd, "run", "dev"] : ["run", "dev"])
    : BACKEND_PROD_ENTRY,
  watch: false,
  // When spawning cmd on Windows, tell PM2 not to use Node interpreter
  interpreter: isDev && process.platform === "win32" ? "none" : "node",
  env: { NODE_ENV: "development" },
  env_production: { NODE_ENV: "production" },
}));

const frontendApps = [
  {
    name: "web",
    cwd: "./apps/web",
    script: isDev
      ? (process.platform === "win32" ? "cmd" : pnpmCmd)
      : "node",
    args: isDev
      ? (process.platform === "win32" ? ["/c", pnpmCmd, "run", "dev"] : ["run", "dev"])
      : "start",
    watch: false,
    interpreter: isDev && process.platform === "win32" ? "none" : "node",
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "console",
    cwd: "./apps/console",
    script: isDev
      ? (process.platform === "win32" ? "cmd" : pnpmCmd)
      : "node",
    args: isDev
      ? (process.platform === "win32" ? ["/c", pnpmCmd, "run", "dev"] : ["run", "dev"])
      : "start",
    watch: false,
    interpreter: isDev && process.platform === "win32" ? "none" : "node",
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
];

module.exports = {
  apps: [...backendServices, ...frontendApps],
};
