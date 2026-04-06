const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3003/auth";

type ApiFailure = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    statusCode?: number;
  };
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  planId: "free" | "pro" | "max";
  creditBalance: number;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
};

export type CreditBalance = {
  userId: string;
  balance: number;
};

export type CreditTransaction = {
  id: string;
  user_id: string;
  amount: number;
  type: "credit" | "debit";
  reason: string;
  request_id?: string;
  balance_after: number;
  created_at: string;
};

export type UsageSummary = {
  thisMonth: {
    totalRequests: number;
    totalTokens: number;
    totalCredits: number;
    successRate: number;
    avgLatencyMs: number;
    topModels: Array<{ model: string; count: number }>;
  };
  last7Days: {
    dailyRequests: Array<{ date: string; count: number }>;
  };
};

export type DeveloperApp = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
};

export type AppUsageRow = {
  total_requests: number;
  total_tokens: number;
  total_credits: number;
  model: string;
  successful_requests: number;
  avg_latency_ms: number;
};

export type AppUsageSummary = {
  appId: string;
  rows: AppUsageRow[];
  from: string;
  to: string;
};

export type Plan = {
  id: "free" | "pro" | "max";
  name: string;
  priceInrPaise: number;
  monthlyCredits: number;
  overagePer1kTokens: number;
};

export type Subscription = {
  userId: string;
  planId: "free" | "pro" | "max";
  status: string;
  razorpaySubscriptionId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ai_gateway_token");
};

export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("ai_gateway_token", token);
};

export const clearAuthToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ai_gateway_token");
};

export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ai_gateway_refresh_token");
};

export const setRefreshToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("ai_gateway_refresh_token", token);
};

export const clearRefreshToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ai_gateway_refresh_token");
};

const resolveUrl = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${API_URL}${url}`;
};

const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> => {
  return Boolean(
    value &&
      typeof value === "object" &&
      "success" in value &&
      typeof (value as { success?: unknown }).success === "boolean",
  );
};

const fetchApi = async <T>(
  url: string,
  options: RequestInit = {},
  config: { auth?: boolean } = {},
): Promise<T> => {
  const shouldAttachAuth = config.auth ?? true;
  const token = shouldAttachAuth ? getAuthToken() : null;

  const response = await fetch(resolveUrl(url), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(response.status, `Invalid JSON response: ${text.slice(0, 100)}`);
    }
  }

  if (!response.ok) {
    const error = payload as ApiFailure | null;
    if (response.status === 401) {
      clearAuthToken();
      clearRefreshToken();
    }
    throw new ApiError(
      response.status,
      error?.error?.message ?? "Request failed",
      error?.error?.code,
    );
  }

  if (isApiEnvelope<T>(payload)) {
    if (!payload.success) {
      throw new ApiError(
        payload.error?.statusCode ?? response.status,
        payload.error?.message ?? "Request failed",
        payload.error?.code,
      );
    }
    return payload.data;
  }

  return payload as T;
};

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      return fetchApi<AuthPayload>(
        `${AUTH_URL}/login`,
        { method: "POST", body: JSON.stringify({ email, password }) },
        { auth: false },
      );
    },
    signup: async (email: string, name: string, password: string) => {
      return fetchApi<AuthPayload>(
        `${AUTH_URL}/signup`,
        { method: "POST", body: JSON.stringify({ email, name, password }) },
        { auth: false },
      );
    },
    me: async () => {
      return fetchApi<UserProfile>("/api/v1/me");
    },
    refresh: async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new ApiError(401, "Missing refresh token");
      }
      return fetchApi<{ accessToken: string; refreshToken: string }>(
        `${AUTH_URL}/refresh`,
        { method: "POST", body: JSON.stringify({ refreshToken }) },
        { auth: false },
      );
    },
    logout: async () => {
      try {
        await fetchApi<{ message: string }>(`${AUTH_URL}/logout`, { method: "POST" });
      } finally {
        clearAuthToken();
        clearRefreshToken();
      }
    },
  },
  credits: {
    getBalance: async () => fetchApi<CreditBalance>("/api/v1/credits"),
    getTransactions: async (limit = 20, offset = 0) => {
      return fetchApi<{ transactions: CreditTransaction[]; userId: string }>(
        `/api/v1/credits/transactions?limit=${limit}&offset=${offset}`,
      );
    },
  },
  usage: {
    getSummary: async () => fetchApi<UsageSummary>("/api/v1/usage/summary"),
  },
  models: {
    list: async () => fetchApi<{ models: string[] }>("/api/v1/models"),
  },
  apps: {
    list: async () => fetchApi<DeveloperApp[]>("/api/v1/apps"),
    create: async (name: string, description?: string) => {
      return fetchApi<{ id: string; name: string; description?: string; apiKey: string }>(
        "/api/v1/apps",
        { method: "POST", body: JSON.stringify({ name, description }) },
      );
    },
    rotateKey: async (appId: string) => {
      return fetchApi<{ apiKey: string }>(`/api/v1/apps/${appId}/keys`, { method: "POST" });
    },
    usage: async (appId: string) => {
      return fetchApi<AppUsageSummary>(`/api/v1/apps/${appId}/usage`);
    },
    delete: async (appId: string) => {
      return fetchApi<{ success: true }>(`/api/v1/apps/${appId}`, { method: "DELETE" });
    },
  },
  billing: {
    getPlans: async () => fetchApi<{ plans: Plan[] }>("/api/v1/billing/plans"),
    getSubscription: async () => fetchApi<Subscription | null>("/api/v1/billing/subscription"),
    subscribe: async (planId: "pro" | "max") => {
      return fetchApi<{
        id: string;
        userId: string;
        planId: "pro" | "max";
        razorpaySubscriptionId: string;
        status: string;
      }>("/api/v1/billing/subscribe", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
    },
    cancel: async () => fetchApi<Subscription>("/api/v1/billing/cancel", { method: "POST" }),
  },
};
