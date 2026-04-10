import http from "node:http";
import { URL } from "node:url";
import { AIGateway } from "@mihirrabari/ai-gateway";

const port = Number(process.env.EXAMPLE_APP_SERVER_PORT ?? 4174);
const clientId = process.env.VITE_AI_GATEWAY_CLIENT_ID ?? "";
const clientSecret = process.env.AI_GATEWAY_CLIENT_SECRET ?? "";
const redirectUri = process.env.VITE_AI_GATEWAY_REDIRECT_URI ?? "http://localhost:5173";
const baseUrl = process.env.VITE_AI_GATEWAY_API_URL ?? "http://localhost:3001";
const authUrl = process.env.VITE_AI_GATEWAY_AUTH_URL ?? "http://localhost:3003";

function sendJson(reply, statusCode, payload) {
  reply.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  reply.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, reply) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(reply, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/auth/callback") {
    if (!clientId || !clientSecret) {
      return sendJson(reply, 500, {
        success: false,
        error: { message: "Missing AI Gateway client credentials in example-app/.env" },
      });
    }

    const callbackUrl = url.searchParams.get("url");
    if (!callbackUrl) {
      return sendJson(reply, 400, {
        success: false,
        error: { message: "Missing callback url" },
      });
    }

    try {
      const ai = new AIGateway({
        clientId,
        redirectUri,
        baseUrl,
        authUrl,
      });
      const result = await ai.handleCallback(clientSecret, callbackUrl);
      return sendJson(reply, 200, { success: true, data: result });
    } catch (error) {
      return sendJson(reply, 400, {
        success: false,
        error: { message: error instanceof Error ? error.message : "OAuth callback failed" },
      });
    }
  }

  return sendJson(reply, 404, {
    success: false,
    error: { message: "Not found" },
  });
});

server.listen(port, () => {
  console.log(`Example app helper listening on http://localhost:${port}`);
});
