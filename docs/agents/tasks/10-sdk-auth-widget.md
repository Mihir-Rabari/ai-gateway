# Agent 10 — JavaScript SDK + Auth Widget

**Owner:** Agent 10
**Scope:** `packages/sdk-js/`
**Must NOT touch:** Backend services, frontend app, other packages (read only)

---

## Your Mission

Build the SDK that every developer uses to integrate AI Gateway into their apps. The SDK must be dead simple — one line to install, intuitive API, TypeScript-first. The auth widget (`signIn()`) is the key differentiator that makes AI Gateway feel like "Sign in with Google."

---

## Current State

The SDK package exists at `packages/sdk-js/` but is mostly stubbed.

---

## Final SDK API Design

```typescript
// User-facing SDK
import { AIGateway } from '@ai-gateway/sdk-js';

// Initialize
const ai = new AIGateway({
  apiKey: 'agk_....',      // User's API key (optional if using signIn)
  appId: 'app_....',       // Developer's app ID (required)
  baseUrl: 'https://api.ai-gateway.io',  // optional, defaults to production
});

// Chat with any model
const result = await ai.chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
  maxTokens: 512,
});
console.log(result.output);        // "Hello! How can I help?"
console.log(result.creditsUsed);   // 5
console.log(result.latencyMs);     // 1240

// Get credit balance
const balance = await ai.credits();
// { balance: 95, planId: 'free' }

// Sign in with AI Gateway (popup flow)
// Returns access token after user authenticates
const { token, user } = await AIGateway.signIn({
  appId: 'app_....',
  popupUrl: 'https://app.ai-gateway.io/auth/popup',  // optional
});
// Now use the token:
ai.setToken(token);
```

---

## Tasks

### Task 1 — Core SDK Class

Create `packages/sdk-js/src/index.ts`:

```typescript
export interface AIGatewayConfig {
  appId: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  requestId: string;
  output: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  creditsUsed: number;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface CreditsResult {
  balance: number;
  planId: 'free' | 'pro' | 'max';
}

export class AIGateway {
  private readonly appId: string;
  private readonly baseUrl: string;
  private apiKey: string | undefined;
  private accessToken: string | undefined;

  constructor(config: AIGatewayConfig) {
    this.appId = config.appId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.ai-gateway.io';
  }

  setToken(token: string): void {
    this.accessToken = token;
  }

  private getAuthHeader(): string {
    const token = this.accessToken ?? this.apiKey;
    if (!token) throw new Error('AIGateway: No API key or access token set. Call signIn() first.');
    return `Bearer ${token}`;
  }

  async chat(options: ChatOptions): Promise<ChatResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(),
        'X-App-Id': this.appId,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        maxTokens: options.maxTokens,
      }),
    });

    const json = await res.json() as { success: boolean; data?: ChatResult; error?: { message: string } };

    if (!json.success || !json.data) {
      throw new Error(`AIGateway chat error: ${json.error?.message ?? 'Unknown error'}`);
    }

    return {
      ...json.data,
      creditsUsed: json.data.creditsDeducted,
    } as ChatResult;
  }

  async credits(): Promise<CreditsResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/credits`, {
      headers: { Authorization: this.getAuthHeader() },
    });

    const json = await res.json() as { success: boolean; data?: CreditsResult };
    if (!json.success || !json.data) throw new Error('Failed to fetch credits');
    return json.data;
  }

  // ─── Static: Sign in with AI Gateway ────────────────────

  static async signIn(options: {
    appId: string;
    popupUrl?: string;
    width?: number;
    height?: number;
  }): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
    const url = options.popupUrl ?? 'https://app.ai-gateway.io/auth/popup';
    const width = options.width ?? 420;
    const height = options.height ?? 560;

    const left = Math.round((window.screen.width - width) / 2);
    const top = Math.round((window.screen.height - height) / 2);

    const popup = window.open(
      `${url}?appId=${options.appId}`,
      'ai-gateway-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no`
    );

    if (!popup) {
      throw new Error('AIGateway: Could not open auth popup. Check if popups are blocked.');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('AIGateway: Auth timed out (2 minutes)'));
        cleanup();
      }, 2 * 60 * 1000);

      function cleanup() {
        clearTimeout(timeout);
        window.removeEventListener('message', handleMessage);
      }

      function handleMessage(event: MessageEvent) {
        // Only accept messages from our popup
        if (!url.startsWith(event.origin) && event.origin !== window.location.origin) return;
        
        const data = event.data as { type?: string; accessToken?: string; user?: any };
        if (data.type === 'AI_GATEWAY_AUTH' && data.accessToken) {
          cleanup();
          resolve({ token: data.accessToken, user: data.user });
        }
      }

      window.addEventListener('message', handleMessage);

      // Detect if popup was closed without auth
      const pollClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollClosed);
          cleanup();
          reject(new Error('AIGateway: Auth popup was closed'));
        }
      }, 500);
    });
  }
}
```

### Task 2 — Build Configuration

Create `packages/sdk-js/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Update `packages/sdk-js/package.json`:
```json
{
  "name": "@ai-gateway/sdk-js",
  "version": "0.1.0",
  "description": "JavaScript SDK for AI Gateway",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./widget": {
      "import": "./dist/widget.mjs",
      "types": "./dist/widget.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "build:widget": "tsup src/widget.ts --format esm,iife --globalName AIGateway --outDir dist",
    "dev": "tsup src/index.ts --format esm,cjs --dts --watch",
    "type-check": "tsc --noEmit"
  }
}
```

Install `tsup` (the bundler):
```bash
pnpm --filter @ai-gateway/sdk-js add -D tsup typescript
```

### Task 3 — Standalone Widget (for CDN `<script>` tag)

Create `packages/sdk-js/src/widget.ts`:

```typescript
// IIFE bundle for use as <script src="...widget.js">
// After loading, `window.AIGateway` is available

export { AIGateway } from './index.js';
```

Build command: `tsup src/widget.ts --format iife --globalName AIGateway`

After building, developers can use:
```html
<script src="https://cdn.ai-gateway.io/sdk.js"></script>
<script>
  const { token } = await window.AIGateway.signIn({ appId: 'app_xxx' });
</script>
```

### Task 4 — SDK README

Create `packages/sdk-js/README.md`:

```markdown
# @ai-gateway/sdk-js

JavaScript SDK for AI Gateway — route AI requests with automatic credit management.

## Install

\`\`\`bash
npm install @ai-gateway/sdk-js
\`\`\`

## Quick Start

\`\`\`typescript
import { AIGateway } from '@ai-gateway/sdk-js';

const ai = new AIGateway({ appId: 'app_xxx', apiKey: 'agk_...' });

const result = await ai.chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.output);
\`\`\`

## Sign in with AI Gateway

Open a popup where the user signs into their AI Gateway account:

\`\`\`typescript
const { token, user } = await AIGateway.signIn({ appId: 'app_xxx' });
console.log(`Welcome, ${user.name}!`);
\`\`\`

## Models

| Model | Credits / 1k tokens |
|-------|-------------------|
| gpt-4o | 10 |
| gpt-3.5-turbo | 1 |
| claude-3-5-sonnet | 12 |
| claude-3-haiku | 2 |
| gemini-1.5-pro | 8 |
| gemini-1.5-flash | 1 |
```

### Task 5 — Unit Tests

```typescript
describe('AIGateway SDK', () => {
  // Mock fetch globally
  // Test: chat() sends correct headers + body
  // Test: chat() throws on error response
  // Test: credits() returns balance
  // Test: setToken() updates auth header
  // Test: signIn() opens popup and resolves on postMessage
});
```

### Task 6 — TypeScript Strict Types

All public API methods must have full JSDoc:
```typescript
/**
 * Send a chat message to any AI model.
 *
 * @param options - Chat configuration
 * @param options.model - Model ID (e.g. 'gpt-4o', 'claude-3-5-sonnet-20241022')
 * @param options.messages - Conversation history
 * @param options.maxTokens - Maximum tokens to generate (default: 1024)
 * @returns Chat result with output text and token/credit usage
 * @throws {Error} When insufficient credits or provider error
 *
 * @example
 * const result = await ai.chat({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'What is TypeScript?' }],
 * });
 */
```

---

## postMessage Protocol (Auth Widget ↔ Popup)

**Parent window sends:** Nothing — just opens the popup

**Popup sends on success:**
```typescript
{
  type: 'AI_GATEWAY_AUTH',
  accessToken: 'eyJ...',
  user: { id: '...', email: '...', name: '...' }
}
```

**Popup sends on error:**
```typescript
{ type: 'AI_GATEWAY_AUTH_ERROR', message: 'Login failed' }
```

**Security:** The parent window must only accept messages from the expected popup origin.
In the `handleMessage` function, always check `event.origin` against the popup URL's origin.

---

## Do NOT Touch

- `apps/web/` — Agent 9 owns the frontend
- `apps/auth-service/` — Agent 2 owns auth logic
- Backend services — read their API docs only
