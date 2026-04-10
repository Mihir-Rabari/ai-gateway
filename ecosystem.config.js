// PM2 Ecosystem Configuration
// Usage:
//   Development:  pnpm pm2:dev
//   Production:   pnpm pm2:start
//   Stop all:     pnpm pm2:stop
//   Delete all:   pnpm pm2:delete
//   Logs:         pnpm pm2:logs

const isDev = process.env.NODE_ENV !== "production";
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const isWin = process.platform === "win32";
const scriptCmd = isWin ? "cmd.exe" : pnpmCmd;
const makeArgs = (dev, entry) => {
  if (dev) {
    return isWin ? ["/c", pnpmCmd, "run", "dev"] : ["run", "dev"];
  }
  // production: run the built entry
  return isWin ? ["/c", pnpmCmd, entry] : [entry];
};

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
].map((name) => {
  return {
    name,
    cwd: `./apps/${name}`,
    script: "node",
    args: [BACKEND_PROD_ENTRY],
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  };
});

const frontendApps = [
  {
    name: "web",
    cwd: "./apps/web",
    script: isDev ? scriptCmd : "node",
    args: isDev ? makeArgs(true, BACKEND_PROD_ENTRY) : ["start"],
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
  {
    name: "console",
    cwd: "./apps/console",
    script: isDev ? scriptCmd : "node",
    args: isDev ? makeArgs(true, BACKEND_PROD_ENTRY) : ["start"],
    watch: false,
    env: { NODE_ENV: "development" },
    env_production: { NODE_ENV: "production" },
  },
];

module.exports = {
  apps: [...backendServices, ...frontendApps],
};
