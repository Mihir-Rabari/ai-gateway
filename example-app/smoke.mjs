import { AIGateway } from "@mihirrabari/ai-gateway";

const ai = new AIGateway({
  clientId: "client_demo",
  redirectUri: "http://localhost:5173",
  baseUrl: "http://localhost:3001",
  authUrl: "http://localhost:3003",
});

console.log(JSON.stringify({
  sdkLoaded: typeof AIGateway === "function",
  hasChat: typeof ai.chat === "function",
  hasSignIn: typeof ai.signIn === "function"
}, null, 2));
