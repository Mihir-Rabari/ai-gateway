// ═══════════════════════════════════════════════════
// @ai-gateway/types — Shared TypeScript Types
// ═══════════════════════════════════════════════════

// ─────────────────────────────────────────
// Core Domain Models
// ─────────────────────────────────────────

export type PlanType = 'free' | 'pro' | 'max';

export interface User {
  id: string;
  email: string;
  name: string;
  planId: PlanType;
  creditBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: PlanType;
  name: string;
  credits: number;
  priceMonthly: number; // in paise (INR * 100)
  priority: 'low' | 'standard' | 'high';
}

export interface RegisteredApp {
  id: string;
  name: string;
  developerId: string;
  apiKey: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanType;
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  razorpaySubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;         // positive = credit added, negative = deducted
  type: 'debit' | 'credit';
  reason: 'request' | 'subscription' | 'refund' | 'admin';
  requestId?: string;
  balanceAfter: number;
  createdAt: Date;
}

// ─────────────────────────────────────────
// Gateway Request / Response
// ─────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface GatewayRequest {
  requestId: string;
  userId: string;
  appId: string;
  model: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface GatewayResponse {
  requestId: string;
  output: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  creditsDeducted: number;
  model: string;
  provider: string;
  latencyMs: number;
}

// ─────────────────────────────────────────
// Provider Types
// ─────────────────────────────────────────

export type ProviderName = 'openai' | 'anthropic' | 'google';

export interface Provider {
  name: ProviderName;
  models: string[];
  healthy: boolean;
  latencyMs?: number;
}

// ─────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  email: string;
  planId: PlanType;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'name' | 'planId' | 'creditBalance'>;
}

// ─────────────────────────────────────────
// Kafka Event Types
// ─────────────────────────────────────────

export interface BaseEvent {
  eventId: string;
  timestamp: string; // ISO 8601
  version: '1.0';
}

// auth.events
export type AuthEventType = 'user.created' | 'user.login' | 'user.logout';

export interface AuthEvent extends BaseEvent {
  topic: 'auth.events';
  type: AuthEventType;
  userId: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

// credit.events
export type CreditEventType =
  | 'credit.deducted'
  | 'credit.added'
  | 'credit.locked'
  | 'credit.released'
  | 'credit.low';

export interface CreditEvent extends BaseEvent {
  topic: 'credit.events';
  type: CreditEventType;
  userId: string;
  amount: number;
  requestId?: string;
  balanceAfter?: number;
}

// billing.events
export type BillingEventType =
  | 'billing.subscription.created'
  | 'billing.subscription.renewed'
  | 'billing.subscription.cancelled'
  | 'billing.payment.failed';

export interface BillingEvent extends BaseEvent {
  topic: 'billing.events';
  type: BillingEventType;
  userId: string;
  planId: PlanType;
  amountPaise: number;
}

// usage.events
export type UsageEventType = 'usage.request.completed' | 'usage.request.failed';

export interface UsageEvent extends BaseEvent {
  topic: 'usage.events';
  type: UsageEventType;
  requestId: string;
  userId: string;
  appId: string;
  model: string;
  provider: ProviderName;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  creditsDeducted: number;
  latencyMs: number;
  errorCode?: string;
}

// routing.events
export type RoutingEventType = 'routing.selected' | 'routing.fallback';

export interface RoutingEvent extends BaseEvent {
  topic: 'routing.events';
  type: RoutingEventType;
  requestId: string;
  model: string;
  provider: ProviderName;
  latencyMs?: number;
  reason?: string;
}

// Union of all events
export type GatewayEvent =
  | AuthEvent
  | CreditEvent
  | BillingEvent
  | UsageEvent
  | RoutingEvent;

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; statusCode: number } };

// ─────────────────────────────────────────
// Dev Revenue Types
// ─────────────────────────────────────────

export interface DevWallet {
  id: string;
  developerId: string;
  balance: number; // INR
  totalEarned: number;
  createdAt: Date;
  updatedAt: Date;
}
