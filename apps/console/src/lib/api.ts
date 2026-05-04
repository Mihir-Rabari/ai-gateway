const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3003/auth";

// Deduplication lock: if multiple in-flight requests all hit 401 at the same time
// only one refresh call is issued; all callers await the same promise.
let _refreshLock: Promise<{ accessToken: string; refreshToken: string }> | null = null;

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
  clientId?: string | null;
  redirectUris?: string[];
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
  config: { auth?: boolean; skipRefresh?: boolean } = {},
): Promise<T> => {
  const shouldAttachAuth = config.auth ?? true;
  const token = shouldAttachAuth ? getAuthToken() : null;
  const hasJsonBody =
    options.body !== undefined &&
    options.body !== null &&
    !(options.body instanceof FormData);
  const headers = new Headers(options.headers ?? {});

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(resolveUrl(url), {
    ...options,
    headers,
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

    // Silent refresh: on 401 for an authenticated request, try refreshing before giving up.
    // skipRefresh prevents infinite loops when the refresh call itself returns 401.
    if (response.status === 401 && shouldAttachAuth && !config.skipRefresh) {
      const storedRefreshToken = getRefreshToken();
      if (storedRefreshToken) {
        try {
          if (!_refreshLock) {
            _refreshLock = fetchApi<{ accessToken: string; refreshToken: string }>(
              `${AUTH_URL}/refresh`,
              { method: "POST", body: JSON.stringify({ refreshToken: storedRefreshToken }) },
              { auth: false, skipRefresh: true },
            ).finally(() => {
              _refreshLock = null;
            });
          }
          const tokens = await _refreshLock;
          setAuthToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);
          // Retry the original request with the new access token.
          return fetchApi<T>(url, options, { ...config, skipRefresh: true });
        } catch {
          // Refresh failed — session is unrecoverable.
          clearAuthToken();
          clearRefreshToken();
          throw new ApiError(401, "Session expired. Please log in again.");
        }
      }
      // No refresh token available — clear and throw.
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
        { auth: false, skipRefresh: true },
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
    get: async (id: string) => fetchApi<DeveloperApp>(`/api/v1/apps/${id}`),
    create: async (name: string, description?: string, redirectUris?: string[]) => {
      return fetchApi<{
        id: string;
        name: string;
        description?: string;
        apiKey: string;
        clientId: string;
        clientSecret: string;
        redirectUris: string[];
      }>(
        "/api/v1/apps",
        { method: "POST", body: JSON.stringify({ name, description, redirectUris: redirectUris ?? [] }) },
      );
    },
    updateRedirectUris: async (appId: string, redirectUris: string[]) => {
      return fetchApi<{ redirectUris: string[] }>(
        `/api/v1/apps/${appId}/redirect-uris`,
        { method: "PUT", body: JSON.stringify({ redirectUris }) },
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
  developers: {
    getStatus: async () =>
      fetchApi<{ isDeveloper: boolean; enrolledAt: string | null }>("/api/v1/developers/status"),
    enroll: async () =>
      fetchApi<{ enrolled: boolean }>("/api/v1/developers/enroll", { method: "POST" }),
  },
};
