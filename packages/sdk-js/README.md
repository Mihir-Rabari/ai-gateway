# @ai-gateway/sdk-js

JavaScript/TypeScript SDK for AI Gateway — OAuth-style authentication + AI request pipeline.

## Install

```bash
npm install @ai-gateway/sdk-js
```

---

## Quick Start (OAuth flow — recommended)

```typescript
import { AIGateway } from '@ai-gateway/sdk-js';

// 1. Initialize with your OAuth credentials
const ai = new AIGateway({
  clientId: 'client_xxx',          // from developer console
  redirectUri: 'http://localhost:3000/callback',
});

// 2. Redirect user to AI Gateway sign-in page
await ai.signIn();
// → browser navigates to https://auth.ai-gateway.io/oauth/authorize?...

// 3. On your /callback page — exchange the code for tokens
//    NOTE: keep clientSecret on your server in production
const result = await ai.handleCallback('your_client_secret');
console.log(`Welcome, ${result.user.name}!`);

// 4. Make AI requests
const response = await ai.chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.output);
```

---

## OAuth Flow Explained

```
1. Developer calls ai.signIn()
       ↓
2. Browser → GET /oauth/authorize?client_id=...&redirect_uri=...&state=...
       ↓
3. AI Gateway shows login/consent page
       ↓
4. User enters email + password
       ↓
5. AI Gateway → 302 redirect_uri?code=AUTH_CODE&state=...
       ↓
6. Developer calls ai.handleCallback(clientSecret)
       ↓
7. SDK → POST /oauth/token  { client_id, client_secret, code, redirect_uri }
       ↓
8. Tokens stored, user authenticated
```

---

## App Registration

Register an app from the developer console or via the API:

```bash
curl -X POST https://api.ai-gateway.io/api/v1/apps \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "redirectUris": ["http://localhost:3000/callback", "https://myapp.com/callback"]
  }'
```

Response:
```json
{
  "id": "...",
  "clientId": "client_xxx",
  "clientSecret": "secret_xxx",
  "redirectUris": ["http://localhost:3000/callback"]
}
```

> **Security:** `clientSecret` is shown only once. Store it securely (env var, secret manager).

---

## SDK API

### `new AIGateway(config)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | `string` | ✅ | OAuth client ID from developer console |
| `redirectUri` | `string` | ✅ | Must match a registered redirect URI |
| `baseUrl` | `string` | ❌ | Override API URL (default: `https://api.ai-gateway.io`) |
| `authUrl` | `string` | ❌ | Override auth URL (default: `https://auth.ai-gateway.io`) |
| `storage` | `TokenStorage` | ❌ | Custom token persistence (default: in-memory) |

---

### `ai.signIn()`

Redirects the browser to the AI Gateway login/consent page.

```typescript
await ai.signIn();
// → redirects browser, no return value
```

---

### `ai.handleCallback(clientSecret, url?)`

Called on the redirect URI page. Exchanges the auth code for tokens and stores them.

```typescript
const result = await ai.handleCallback('your_client_secret');
// result: { accessToken, refreshToken, user: { id, email, name, planId, creditBalance } }
```

| Parameter | Description |
|-----------|-------------|
| `clientSecret` | Your app's secret (keep server-side in production) |
| `url` | Callback URL to parse (defaults to `window.location.href`) |

---

### `ai.signOut()`

Clears all stored tokens.

```typescript
await ai.signOut();
```

---

### `ai.getUser()`

Returns the currently authenticated user's profile.

```typescript
const user = await ai.getUser();
// { id, email, name, planId, creditBalance } or null
```

---

### `ai.getCredits()` / `ai.credits()`

Returns the user's credit balance and plan.

```typescript
const { balance, planId } = await ai.getCredits();
```

---

### `ai.isAuthenticated()`

Returns `true` if a token is present.

```typescript
if (await ai.isAuthenticated()) {
  // user is logged in
}
```

---

### `ai.chat(options)`

Send a message to an AI model.

```typescript
const result = await ai.chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'What is TypeScript?' }],
  maxTokens: 1024,       // optional
  temperature: 0.7,      // optional
});

console.log(result.output);       // string response
console.log(result.creditsUsed);  // credits deducted
console.log(result.latencyMs);    // request latency
```

---

### `ai.stream(options)`

Stream a response token-by-token via Server-Sent Events.

```typescript
for await (const chunk of ai.stream({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Tell me a story' }],
})) {
  process.stdout.write(chunk);
}
```

---

## Token Storage

By default, tokens are stored in memory (cleared on page reload). Provide a custom `storage` to persist them:

```typescript
const ai = new AIGateway({
  clientId: 'client_xxx',
  redirectUri: 'http://localhost:3000/callback',
  storage: {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    remove: (key) => localStorage.removeItem(key),
  },
});
```

---

## Example App (React)

```tsx
// App.tsx
import { AIGateway } from '@ai-gateway/sdk-js';

const ai = new AIGateway({
  clientId: import.meta.env.VITE_CLIENT_ID,
  redirectUri: 'http://localhost:5173/callback',
  storage: {
    get: (k) => localStorage.getItem(k),
    set: (k, v) => localStorage.setItem(k, v),
    remove: (k) => localStorage.removeItem(k),
  },
});

// Login button
<button onClick={() => ai.signIn()}>Sign in with AI Gateway</button>

// Callback page (/callback route)
// Option A: Call handleCallback() if you can safely pass clientSecret from env
//   (suitable for server-rendered apps or backends)
useEffect(() => {
  ai.handleCallback(import.meta.env.VITE_CLIENT_SECRET)
    .then(() => navigate('/dashboard'))
    .catch(console.error);
}, []);

// Option B: Send the code to your own backend, receive the access token
//   (recommended for SPAs — keeps clientSecret off the browser)
useEffect(() => {
  fetch('/api/auth/callback?url=' + encodeURIComponent(location.href))
    .then(r => r.json())
    .then(({ accessToken }) => {
      ai.setToken(accessToken); // manually set the token received from backend
      navigate('/dashboard');
    });
}, []);

// Chat
const result = await ai.chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

---

## Error Handling

```typescript
try {
  const result = await ai.chat({ model: 'gpt-4o', messages: [...] });
} catch (err) {
  if (err.message.includes('No access token')) {
    // User not signed in — redirect to login
    await ai.signIn();
  } else if (err.message.includes('Insufficient credits')) {
    // Show upgrade prompt
  } else {
    // Generic error
    console.error(err.message);
  }
}
```

---

## Models

| Model | Credits / 1k tokens |
|-------|-------------------|
| gpt-4o | 10 |
| gpt-3.5-turbo | 1 |
| claude-3-5-sonnet | 12 |
| claude-3-haiku | 2 |
| gemini-1.5-pro | 8 |
| gemini-1.5-flash | 1 |

---

## Security Notes

- **Never expose `clientSecret` in browser-side code** — exchange the code in your backend
- The SDK validates the `state` parameter to prevent CSRF attacks
- Auth codes are single-use and expire after 5 minutes
- All token storage is scoped to your app via namespaced keys
