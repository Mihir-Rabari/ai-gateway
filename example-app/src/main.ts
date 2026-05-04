import "./styles.css";
import { AIGateway, type ChatMessage, type CreditsResult, type UserResult } from "@mihirrabari/ai-gateway";

type StatusTone = "neutral" | "success" | "error";
type DisplayRole = "assistant" | "user" | "system";

type DisplayMessage = {
  id: string;
  role: DisplayRole;
  content: string;
};

type State = {
  configured: boolean;
  ready: boolean;
  authBusy: boolean;
  sending: boolean;
  model: string;
  input: string;
  user: UserResult | null;
  credits: CreditsResult | null;
  status: string;
  statusTone: StatusTone;
  messages: DisplayMessage[];
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app mount point");
}

const appRoot = app;

const env = {
  clientId: import.meta.env.VITE_AI_GATEWAY_CLIENT_ID ?? "",
  redirectUri: import.meta.env.VITE_AI_GATEWAY_REDIRECT_URI ?? window.location.origin,
  baseUrl: import.meta.env.VITE_AI_GATEWAY_API_URL ?? "http://localhost:3001",
  authUrl: import.meta.env.VITE_AI_GATEWAY_AUTH_URL ?? "http://localhost:3003",
};

const STORAGE_KEYS = {
  accessToken: "ai_gw_access_token",
  refreshToken: "ai_gw_refresh_token",
  user: "ai_gw_user",
};

const initialAssistantMessage =
  "Sign in with AI Gateway, pick a Gemini model, and start chatting through the published SDK.";

const storage = {
  get: (key: string) => window.localStorage.getItem(key),
  set: (key: string, value: string) => window.localStorage.setItem(key, value),
  remove: (key: string) => window.localStorage.removeItem(key),
};

const ai = new AIGateway({
  clientId: env.clientId,
  redirectUri: env.redirectUri,
  baseUrl: env.baseUrl,
  authUrl: env.authUrl,
  storage,
});

const state: State = {
  configured: Boolean(env.clientId),
  ready: false,
  authBusy: false,
  sending: false,
  model: "gemini-2.5-flash",
  input: "",
  user: null,
  credits: null,
  status: "",
  statusTone: "neutral",
  messages: [createMessage("assistant", initialAssistantMessage)],
};

function createMessage(role: DisplayRole, content: string): DisplayMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    content,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatus(message: string, tone: StatusTone = "neutral"): void {
  state.status = message;
  state.statusTone = tone;
}

function resetConversation(): void {
  state.messages = [createMessage("assistant", initialAssistantMessage)];
  state.input = "";
}

function sanitizeCallbackUrl(): void {
  const clean = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, "", clean);
}

async function hydrateSession(): Promise<void> {
  console.log("[ExampleApp] Hydrating session...");
  const isAuthenticated = await ai.isAuthenticated();
  if (!isAuthenticated) {
    console.log("[ExampleApp] No active session found.");
    return;
  }

  try {
    const user = await ai.getUser();
    state.user = user;
    console.log("[ExampleApp] Session restored for user:", user?.email);

    if (user) {
      try {
        state.credits = await ai.getCredits();
        console.log("[ExampleApp] Credits loaded:", state.credits.balance);
      } catch {
        console.warn("[ExampleApp] Could not load credits.");
        setStatus("Signed in, but credit balance could not be loaded yet.", "neutral");
      }
      return;
    }

    const maybeRefresh = ai as typeof ai & {
      refreshSession?: () => Promise<unknown>;
    };

    if (typeof maybeRefresh.refreshSession === "function") {
      await maybeRefresh.refreshSession();
      state.user = await ai.getUser();
      if (state.user) {
        state.credits = await ai.getCredits().catch(() => null);
      }
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Could not restore your session.", "error");
  }
}

async function initialize(): Promise<void> {
  if (!state.configured) {
    setStatus("Add your AI Gateway client ID in example-app/.env first.", "error");
    state.ready = true;
    render();
    return;
  }

  render();

  const callbackUrl = window.location.href;
  if (typeof (ai as typeof ai & { hasAuthCallback?: (url?: string) => boolean }).hasAuthCallback === "function"
    ? (ai as typeof ai & { hasAuthCallback: (url?: string) => boolean }).hasAuthCallback(callbackUrl)
    : new URL(callbackUrl).searchParams.has("code")) {
    state.authBusy = true;
    setStatus("Completing sign-in with AI Gateway...", "neutral");
    render();

    try {
      const response = await fetch(`/api/auth/callback?url=${encodeURIComponent(callbackUrl)}`);
      const payload = await response.json() as {
        success: boolean;
        data?: { accessToken: string; refreshToken: string; user: UserResult };
        error?: { message?: string };
      };

      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "OAuth callback failed.");
      }

      storage.set(STORAGE_KEYS.accessToken, payload.data.accessToken);
      storage.set(STORAGE_KEYS.refreshToken, payload.data.refreshToken);
      storage.set(STORAGE_KEYS.user, JSON.stringify(payload.data.user));
      sanitizeCallbackUrl();
      setStatus("Sign-in complete. Your AI Gateway session is ready.", "success");
    } catch (error) {
      sanitizeCallbackUrl();
      setStatus(error instanceof Error ? error.message : "OAuth callback failed.", "error");
    } finally {
      state.authBusy = false;
    }
  }

  await hydrateSession();
  state.ready = true;
  render();
}

async function handleSignIn(): Promise<void> {
  if (!state.configured) {
    setStatus("Set VITE_AI_GATEWAY_CLIENT_ID first.", "error");
    render();
    return;
  }

  console.log("[ExampleApp] Initiating sign-in redirect...");
  state.authBusy = true;
  setStatus("Redirecting you to the AI Gateway consent screen...", "neutral");
  render();

  try {
    await ai.signIn();
  } catch (error) {
    console.error("[ExampleApp] Sign-in redirect failed:", error);
    state.authBusy = false;
    setStatus(error instanceof Error ? error.message : "Failed to start sign-in.", "error");
    render();
  }
}

async function handleSignOut(): Promise<void> {
  state.authBusy = true;
  render();

  try {
    await ai.signOut();
    state.user = null;
    state.credits = null;
    resetConversation();
    setStatus("You have been signed out.", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to sign out cleanly.", "error");
  } finally {
    state.authBusy = false;
    render();
  }
}

async function handleChatSubmit(): Promise<void> {
  const prompt = state.input.trim();
  if (!prompt || state.sending) {
    return;
  }

  if (!state.user) {
    setStatus("Sign in before sending messages.", "error");
    render();
    return;
  }

  const nextUserMessage = createMessage("user", prompt);
  const nextAssistantMessage = createMessage("assistant", "");
  state.messages = [...state.messages, nextUserMessage, nextAssistantMessage];
  state.input = "";
  state.sending = true;
  setStatus(`Sending request through ${state.model}...`, "neutral");
  render();

  const chatMessages: ChatMessage[] = [
    {
      role: "system",
      content: "You are a concise, helpful assistant inside the AI Gateway example app.",
    },
    ...state.messages
      .filter((message) => message.role === "assistant" || message.role === "user")
      .map((message) => ({
        role: message.role as "assistant" | "user",
        content: message.content,
      })),
  ];

  try {
    let finalAssistantText = "";
    let sawStreamChunk = false;

    console.log(`[ExampleApp] Starting stream for model: ${state.model}`);
    for await (const rawChunk of ai.stream({
      model: state.model,
      messages: chatMessages,
      maxTokens: 512,
      temperature: 0.5,
    })) {
      try {
        const parsed = JSON.parse(rawChunk) as { output?: string };
        if (parsed.output) {
          console.log("[ExampleApp] Received chunk:", parsed.output);
          sawStreamChunk = true;
          finalAssistantText += parsed.output;
          nextAssistantMessage.content = finalAssistantText;
          render();
        }
      } catch {
        // Ignore malformed chunks and keep the stream alive.
      }
    }
    console.log("[ExampleApp] Stream completed successfully.");

    if (!sawStreamChunk) {
      throw new Error("The stream completed without returning any text.");
    }

    state.credits = await ai.getCredits().catch(() => state.credits);
    setStatus(
      `Stream completed through ${state.model}. Credit balance refreshed.`,
      "success",
    );
  } catch (error) {
    nextAssistantMessage.role = "system";
    nextAssistantMessage.content =
      error instanceof Error ? error.message : "The request failed before the model could respond.";
    setStatus("The request failed. Check your app credentials and user session.", "error");
  } finally {
    state.sending = false;
    render();
  }
}

function bindEvents(): void {
  const signInButton = document.querySelector<HTMLButtonElement>("[data-action='sign-in']");
  signInButton?.addEventListener("click", () => {
    void handleSignIn();
  });

  const signOutButton = document.querySelector<HTMLButtonElement>("[data-action='sign-out']");
  signOutButton?.addEventListener("click", () => {
    void handleSignOut();
  });

  const modelSelect = document.querySelector<HTMLSelectElement>("[data-field='model']");
  modelSelect?.addEventListener("change", (event) => {
    const target = event.currentTarget as HTMLSelectElement;
    state.model = target.value;
  });

  const textarea = document.querySelector<HTMLTextAreaElement>("[data-field='prompt']");
  textarea?.addEventListener("input", (event) => {
    const target = event.currentTarget as HTMLTextAreaElement;
    state.input = target.value;
  });

  const form = document.querySelector<HTMLFormElement>("[data-form='chat']");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleChatSubmit();
  });
}

function renderSidebar(): string {
  const creditValue = state.credits ? `${state.credits.balance} credits` : "Not loaded";
  const planValue = state.user?.planId ?? "No session";

  return `
    <aside class="card sidebar">
      <div class="brand">
        <div class="brand-mark">AG</div>
        <div>
          <p class="eyebrow">Published SDK demo</p>
          <h1 class="title">Gemini Chat</h1>
        </div>
      </div>

      <p class="subtitle">
        This example app signs in with AI Gateway OAuth and sends Gemini prompts through the published
        <code>@mihirrabari/ai-gateway</code> SDK.
      </p>

      <div class="stat-grid">
        <div class="stat">
          <span class="stat-label">SDK package</span>
          <span class="stat-value">@mihirrabari/ai-gateway@0.0.3</span>
        </div>
        <div class="stat">
          <span class="stat-label">Gemini model</span>
          <span class="stat-value">${escapeHtml(state.model)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Current plan</span>
          <span class="stat-value">${escapeHtml(planValue)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Credits</span>
          <span class="stat-value">${escapeHtml(creditValue)}</span>
        </div>
      </div>

      <div class="panel-block stack">
        <div>
          <h2 class="panel-title">Session</h2>
          <p class="subtitle">
            ${state.user
              ? `Signed in as ${escapeHtml(state.user.name)} (${escapeHtml(state.user.email)})`
              : "No active AI Gateway session yet."}
          </p>
        </div>
        <div class="chip-row">
          <span class="chip">API ${escapeHtml(env.baseUrl)}</span>
          <span class="chip">Auth ${escapeHtml(env.authUrl)}</span>
          <span class="chip">Redirect ${escapeHtml(env.redirectUri)}</span>
        </div>
        <div class="chip-row">
          ${
            state.user
              ? `<button class="button button-danger" data-action="sign-out" ${state.authBusy ? "disabled" : ""}>Sign out</button>`
              : `<button class="button button-primary" data-action="sign-in" ${!state.configured || state.authBusy ? "disabled" : ""}>Sign in with AI Gateway</button>`
          }
        </div>
      </div>

      <div class="panel-block">
        <h2 class="panel-title">Example app setup</h2>
        <p class="subtitle">
          Configure <code>VITE_AI_GATEWAY_CLIENT_ID</code> and <code>AI_GATEWAY_CLIENT_SECRET</code> in
          <code>example-app/.env</code>, then authorize the app with your AI Gateway account.
        </p>
      </div>
    </aside>
  `;
}

function renderMessages(): string {
  return state.messages
    .map((message) => {
      const roleLabel =
        message.role === "assistant" ? "AI Gateway" : message.role === "user" ? "You" : "System";

      return `
        <article class="message ${message.role}">
          <span class="message-meta">${roleLabel}</span>
          <div class="bubble">${escapeHtml(message.content)}</div>
        </article>
      `;
    })
    .join("");
}

function renderMain(): string {
  const statusClass =
    state.statusTone === "error" ? "status error" : state.statusTone === "success" ? "status success" : "status";

  const unauthenticated = !state.user && !state.authBusy;
  const emptyState = `
    <div class="empty-state">
      <div>
        <h3>${state.configured ? "Connect your account to start chatting" : "Add your example app credentials"}</h3>
        <p>
          ${
            state.configured
              ? "The SDK already knows your gateway endpoints. Once you authorize this app, every message you send here will go through AI Gateway and route into Gemini."
              : "This demo is ready, but it needs your app's OAuth client ID and client secret in example-app/.env before the sign-in flow can begin."
          }
        </p>
      </div>
    </div>
  `;

  return `
    <section class="card chat-shell">
      <header class="chat-header">
        <div class="chat-header-copy">
          <p class="eyebrow">Gemini through AI Gateway</p>
          <h2>Chat with ${escapeHtml(state.model)}</h2>
          <p>OAuth auth, user balance, and model requests all run through the SDK.</p>
        </div>
        <div class="field" style="min-width: 220px;">
          <label class="label" for="model-select">Model</label>
          <select class="select" id="model-select" data-field="model">
            <option value="gemini-2.5-flash" ${state.model === "gemini-2.5-flash" ? "selected" : ""}>gemini-2.5-flash</option>
            <option value="gemini-2.5-pro" ${state.model === "gemini-2.5-pro" ? "selected" : ""}>gemini-2.5-pro</option>
          </select>
        </div>
      </header>

      <div class="message-list">
        ${unauthenticated ? emptyState : renderMessages()}
      </div>

      <form class="composer" data-form="chat">
        <div class="${statusClass}">${escapeHtml(state.status)}</div>
        <div class="composer-row">
          <div class="field">
            <label class="label" for="prompt-input">Prompt</label>
            <textarea
              class="textarea"
              id="prompt-input"
              data-field="prompt"
              placeholder="Ask Gemini about your product, architecture, or anything else..."
              ${!state.user || state.authBusy ? "disabled" : ""}
            >${escapeHtml(state.input)}</textarea>
          </div>
          <button class="button button-primary" type="submit" ${!state.user || state.sending || state.authBusy ? "disabled" : ""}>
            ${state.sending ? "Thinking..." : "Send"}
          </button>
        </div>
      </form>
    </section>
  `;
}

function render(): void {
  const loadingMarkup = `
    <div class="app-shell">
      <div class="frame">
        ${renderSidebar()}
        <section class="card chat-shell">
          <div class="empty-state">
            <div>
              <h3>Loading example app...</h3>
              <p>Preparing the SDK session and Gemini chat workspace.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `;

  appRoot.innerHTML = state.ready ? `<div class="app-shell"><div class="frame">${renderSidebar()}${renderMain()}</div></div>` : loadingMarkup;
  bindEvents();
}

render();
void initialize();
