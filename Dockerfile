# base stage: node:20-alpine, install pnpm@11.0.0-dev.1005.
FROM node:20-alpine AS base
RUN npm install -g pnpm@11.0.0-dev.1005
WORKDIR /app

# deps stage: copy package.json, workspace/package.jsons, pnpm-workspace.yaml, and pnpm-lock.yaml. Run pnpm install --frozen-lockfile.
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/analytics-service/package.json ./apps/analytics-service/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/auth-service/package.json ./apps/auth-service/package.json
COPY apps/billing-service/package.json ./apps/billing-service/package.json
COPY apps/console/package.json ./apps/console/package.json
COPY apps/credit-service/package.json ./apps/credit-service/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/routing-service/package.json ./apps/routing-service/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/sdk-js/package.json ./packages/sdk-js/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/utils/package.json ./packages/utils/package.json
RUN pnpm install --frozen-lockfile

# builder stage: copy source, run pnpm build.
FROM deps AS builder
COPY . .
RUN pnpm build

# runner stage: copy full built workspace from builder, node:20-alpine.
FROM node:20-alpine AS runner
RUN npm install -g pnpm@11.0.0-dev.1005
WORKDIR /app
COPY --from=builder /app /app


