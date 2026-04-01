# @ai-gateway/sdk-js

JavaScript SDK for AI Gateway — route AI requests with automatic credit management.

## Install

```bash
npm install @ai-gateway/sdk-js
```

## Quick Start

```typescript
import { AIGateway } from '@ai-gateway/sdk-js';

const ai = new AIGateway({ appId: 'app_xxx', apiKey: 'agk_...' });

const result = await ai.chat({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.output);
```

## Sign in with AI Gateway

Open a popup where the user signs into their AI Gateway account:

```typescript
const { token, user } = await AIGateway.signIn({ appId: 'app_xxx' });
console.log(`Welcome, ${user.name}!`);
```

## Models

| Model | Credits / 1k tokens |
|-------|-------------------|
| gpt-4o | 10 |
| gpt-3.5-turbo | 1 |
| claude-3-5-sonnet | 12 |
| claude-3-haiku | 2 |
| gemini-1.5-pro | 8 |
| gemini-1.5-flash | 1 |
