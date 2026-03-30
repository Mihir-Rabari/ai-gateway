# SDK Module

## Purpose
Make integrating AI Gateway dead simple for developers. If the SDK is annoying, devs leave.

## JavaScript SDK (`@ai-gateway/sdk-js`)

### Installation
```bash
npm install @ai-gateway/sdk-js
```

### Basic Usage
```typescript
import { AiGateway } from '@ai-gateway/sdk-js';

const gateway = new AiGateway({
  appId: 'your-app-id',
  apiKey: 'your-api-key',
});

// Generate text (user must be logged in via AI Gateway)
const response = await gateway.generate({
  userToken: 'user-access-token',
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: 'Fix this TypeScript error: ...' }
  ],
});

console.log(response.output);
console.log(response.creditsDeducted);
```

### SDK Interface
```typescript
interface AiGatewayConfig {
  appId: string;
  apiKey: string;
  baseUrl?: string;  // defaults to https://api.aigateway.dev
}

interface GenerateOptions {
  userToken: string;
  model: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface GenerateResponse {
  requestId: string;
  output: string;
  tokensUsed: number;
  creditsDeducted: number;
  model: string;
  latencyMs: number;
}

class AiGateway {
  constructor(config: AiGatewayConfig);
  
  generate(options: GenerateOptions): Promise<GenerateResponse>;
  generateStream(options: GenerateOptions): AsyncIterable<string>;
  
  // Auth helpers
  getLoginUrl(redirectUri: string): string;
  exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string }>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string }>;
}
```

### Auth Flow (Login with AI Gateway)
```typescript
// Step 1: Redirect user to AI Gateway login
const loginUrl = gateway.getLoginUrl('https://yourapp.com/callback');
window.location.href = loginUrl;

// Step 2: On callback, exchange code for tokens
const { accessToken, refreshToken } = await gateway.exchangeCode(code);

// Step 3: Use accessToken for subsequent requests
const response = await gateway.generate({
  userToken: accessToken,
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## Future SDKs (Phase 3+)
- Python SDK (`pip install ai-gateway`)
- Go SDK
- REST API (always available as fallback)

## SDK Design Principles
- Zero config if possible — smart defaults
- TypeScript-first with full type exports
- Works in Node.js and browser
- Handles token refresh automatically
- Consistent error types
