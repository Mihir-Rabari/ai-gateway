# Example App

A Vite chat app that signs in with AI Gateway and sends streamed Gemini prompts through the published `@mihirrabari/ai-gateway` SDK.

## Setup

```bash
cd example-app
npm install
copy .env.example .env
```

Fill in these values in `.env`:

- `VITE_AI_GATEWAY_CLIENT_ID`
- `AI_GATEWAY_CLIENT_SECRET`
- `VITE_AI_GATEWAY_REDIRECT_URI`
- `VITE_AI_GATEWAY_API_URL`
- `VITE_AI_GATEWAY_AUTH_URL`

## Run

```bash
npm run smoke
npm run dev
```

`npm run dev` starts both:

- the Vite frontend on `http://localhost:5173`
- a tiny local callback helper on `http://localhost:4174`

## What It Covers

- Installs the latest published SDK from npm
- Uses the SDK OAuth sign-in flow
- Exchanges the OAuth callback through a tiny local backend helper so the client secret stays off the browser
- Restores the signed-in user session
- Streams Gemini chat responses through AI Gateway
