import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';

import path from 'path';

// Load .env file from the monorepo root
loadDotenv({ path: path.resolve(process.cwd(), '../../.env') });

// ─────────────────────────────────────────
// Base Config Schema (shared across all services)
// ─────────────────────────────────────────

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  KAFKA_BROKERS: z.string(),
  KAFKA_CLIENT_ID: z.string().default('ai-gateway'),
  KAFKA_GROUP_ID: z.string().default('ai-gateway-group'),
});

// ─────────────────────────────────────────
// Auth Service Config
// ─────────────────────────────────────────

const authSchema = baseSchema.extend({
  AUTH_SERVICE_PORT: z.coerce.number().default(3003),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  AUTH_EVENTS_CONSUMER_ENABLED: z.coerce.boolean().default(false),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

// ─────────────────────────────────────────
// Gateway Config
// ─────────────────────────────────────────

const gatewaySchema = baseSchema.extend({
  GATEWAY_PORT: z.coerce.number().default(3002),
  AUTH_SERVICE_URL: z.string().url(),
  CREDIT_SERVICE_URL: z.string().url(),
  ROUTING_SERVICE_URL: z.string().url(),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

// ─────────────────────────────────────────
// Credit Service Config
// ─────────────────────────────────────────

const creditSchema = baseSchema.extend({
  CREDIT_SERVICE_PORT: z.coerce.number().default(3005),
  CREDIT_LOCK_TTL_SECONDS: z.coerce.number().default(30),
  FREE_PLAN_CREDITS: z.coerce.number().default(100),
  PRO_PLAN_CREDITS: z.coerce.number().default(1000),
  MAX_PLAN_CREDITS: z.coerce.number().default(5000),
});

// ─────────────────────────────────────────
// Billing Service Config
// ─────────────────────────────────────────

const billingSchema = baseSchema.extend({
  BILLING_SERVICE_PORT: z.coerce.number().default(3004),
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  RAZORPAY_WEBHOOK_SECRET: z.string(),
  RAZORPAY_PLAN_ID_PRO: z.string(),
  RAZORPAY_PLAN_ID_MAX: z.string(),
  CREDIT_SERVICE_URL: z.string().url(),
  FREE_PLAN_CREDITS: z.coerce.number().default(100),
  PRO_PLAN_CREDITS: z.coerce.number().default(1000),
  MAX_PLAN_CREDITS: z.coerce.number().default(5000),
});

// ─────────────────────────────────────────
// Routing Service Config
// ─────────────────────────────────────────

const routingSchema = baseSchema.extend({
  ROUTING_SERVICE_PORT: z.coerce.number().default(3006),
  OPENAI_API_KEY: z.string(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
});

// ─────────────────────────────────────────
// Analytics Service Config
// ─────────────────────────────────────────

const analyticsSchema = baseSchema.extend({
  ANALYTICS_SERVICE_PORT: z.coerce.number().default(3007),
  CLICKHOUSE_HOST: z.string().url(),
  CLICKHOUSE_USER: z.string().default('default'),
  CLICKHOUSE_PASSWORD: z.string().default(''),
  CLICKHOUSE_DATABASE: z.string().default('ai_gateway_analytics'),
});

// ─────────────────────────────────────────
// Config Loader
// ─────────────────────────────────────────

function loadConfig<T>(schema: z.ZodType<T>, env = process.env): T {
  const result = schema.safeParse(env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const getAuthConfig = () => loadConfig(authSchema);
export const getGatewayConfig = () => loadConfig(gatewaySchema);
export const getCreditConfig = () => loadConfig(creditSchema);
export const getBillingConfig = () => loadConfig(billingSchema);
export const getRoutingConfig = () => loadConfig(routingSchema);
export const getAnalyticsConfig = () => loadConfig(analyticsSchema);

// ─────────────────────────────────────────
// Plan Constants
// ─────────────────────────────────────────

export const PLANS = {
  free: { id: 'free', name: 'Free', credits: 100, priceMonthly: 0, priority: 'low' },
  pro: { id: 'pro', name: 'Pro', credits: 1000, priceMonthly: 49900, priority: 'standard' },
  max: { id: 'max', name: 'Max', credits: 5000, priceMonthly: 149900, priority: 'high' },
} as const;

export const KAFKA_TOPICS = {
  AUTH: 'auth.events',
  CREDIT: 'credit.events',
  BILLING: 'billing.events',
  USAGE: 'usage.events',
  ROUTING: 'routing.events',
  ANALYTICS: 'analytics.events',
} as const;

// ─────────────────────────────────────────
// First-party App IDs
// Requests originating from these IDs are not routed through a developer
// app and therefore do not earn developer wallet commission.
// ─────────────────────────────────────────

export const FIRST_PARTY_APP_IDS = new Set([
  'unknown',
  'api-direct',
  'web-direct',
  'web-dashboard',
]);
