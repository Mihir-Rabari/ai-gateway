import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { ok, fail, createLogger } from '@ai-gateway/utils';
import { OAuthService, OAuthErrors } from '../services/oauthService.js';

const logger = createLogger('oauth-controller');

const HTML_CONTENT_TYPE = 'text/html; charset=utf-8';

function buildLoginPage(opts: {
  appName: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  error?: string;
}): string {
  const escapedAppName = opts.appName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const errorHtml = opts.error
    ? `<div class="error">${opts.error.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in with AI Gateway</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      padding: 40px 36px 32px;
      width: 100%;
      max-width: 400px;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: #4f46e5;
      margin-bottom: 8px;
      text-align: center;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      text-align: center;
      margin-bottom: 24px;
    }
    .app-badge {
      background: #eef2ff;
      color: #4338ca;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 24px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    input[type="email"], input[type="password"] {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      color: #111827;
      margin-bottom: 16px;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="email"]:focus, input[type="password"]:focus {
      border-color: #4f46e5;
    }
    button[type="submit"] {
      width: 100%;
      padding: 11px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button[type="submit"]:hover { background: #4338ca; }
    .error {
      background: #fef2f2;
      color: #b91c1c;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .terms {
      margin-top: 20px;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">AI Gateway</div>
    <p class="subtitle">Sign in to continue to</p>
    <div class="app-badge">${escapedAppName}</div>
    ${errorHtml}
    <form method="POST" action="/oauth/authorize/submit" autocomplete="on">
      <input type="hidden" name="client_id" value="${encodeURIComponent(opts.clientId)}" />
      <input type="hidden" name="redirect_uri" value="${encodeURIComponent(opts.redirectUri)}" />
      <input type="hidden" name="scope" value="${encodeURIComponent(opts.scope)}" />
      <input type="hidden" name="state" value="${encodeURIComponent(opts.state)}" />
      <label for="email">Email</label>
      <input type="email" id="email" name="email" placeholder="you@example.com" required autocomplete="email" />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password" />
      <button type="submit">Sign in &amp; Authorize</button>
    </form>
    <p class="terms">By signing in you authorize <strong>${escapedAppName}</strong> to access your AI Gateway account on your behalf.</p>
  </div>
</body>
</html>`;
}

function buildErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Authorization Error — AI Gateway</title>
  <style>
    body { font-family: sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f0f2f5; }
    .card { background:#fff; border-radius:12px; padding:40px; max-width:420px; text-align:center; box-shadow:0 4px 24px rgba(0,0,0,.1); }
    h1 { color:#b91c1c; margin-bottom:12px; }
    p { color:#6b7280; font-size:14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorization Failed</h1>
    <p>${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
  </div>
</body>
</html>`;
}

export class OAuthController {
  private readonly oauthService: OAuthService;

  constructor(db: Pool, redis: Redis) {
    this.oauthService = new OAuthService(db, redis);
  }

  // GET /oauth/authorize
  async authorize(
    req: FastifyRequest<{
      Querystring: {
        client_id?: string;
        redirect_uri?: string;
        response_type?: string;
        scope?: string;
        state?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    const { client_id, redirect_uri, response_type, scope, state } = req.query;

    try {
      const { appName } = await this.oauthService.validateAuthorizeRequest({
        clientId: client_id ?? '',
        redirectUri: redirect_uri ?? '',
        responseType: response_type ?? '',
        scope,
        state,
      });

      return reply
        .header('Content-Type', HTML_CONTENT_TYPE)
        .header('Cache-Control', 'no-store')
        .send(
          buildLoginPage({
            appName,
            clientId: client_id!,
            redirectUri: redirect_uri!,
            scope: scope ?? 'basic',
            state: state ?? '',
          }),
        );
    } catch (err) {
      const error = err as { statusCode?: number; message?: string; code?: string };
      logger.warn({ err, query: req.query }, 'OAuth authorize validation failed');
      return reply
        .status(error.statusCode ?? 400)
        .header('Content-Type', HTML_CONTENT_TYPE)
        .header('Cache-Control', 'no-store')
        .send(buildErrorPage(error.message ?? 'Authorization error'));
    }
  }

  // POST /oauth/authorize/submit  (form submission from login page)
  async authorizeSubmit(
    req: FastifyRequest<{
      Body: {
        client_id?: string;
        redirect_uri?: string;
        scope?: string;
        state?: string;
        email?: string;
        password?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    const {
      client_id,
      redirect_uri,
      scope,
      state,
      email,
      password,
    } = req.body;

    // Decode URL-encoded hidden fields (form sends encodeURIComponent values)
    const clientId = client_id ? decodeURIComponent(client_id) : '';
    const redirectUri = redirect_uri ? decodeURIComponent(redirect_uri) : '';
    const decodedScope = scope ? decodeURIComponent(scope) : 'basic';
    const decodedState = state ? decodeURIComponent(state) : '';

    if (!clientId || !redirectUri || !email || !password) {
      return reply
        .status(400)
        .header('Content-Type', HTML_CONTENT_TYPE)
        .header('Cache-Control', 'no-store')
        .send(buildErrorPage('Missing required fields'));
    }

    try {
      const { redirectUrl } = await this.oauthService.authorizeUser({
        clientId,
        redirectUri,
        scope: decodedScope,
        state: decodedState,
        email,
        password,
      });

      return reply
        .header('Cache-Control', 'no-store')
        .redirect(redirectUrl, 302);
    } catch (err) {
      const error = err as { statusCode?: number; message?: string; code?: string };
      logger.warn({ err, clientId }, 'OAuth authorize submit failed');

      // For credential errors, show the form again with an error message
      const isAuthError = error.code === 'AUTH_006' || error.statusCode === 401;
      if (isAuthError) {
        try {
          const { appName } = await this.oauthService.validateAuthorizeRequest({
            clientId,
            redirectUri,
            responseType: 'code',
          });
          return reply
            .status(401)
            .header('Content-Type', HTML_CONTENT_TYPE)
            .header('Cache-Control', 'no-store')
            .send(
              buildLoginPage({
                appName,
                clientId,
                redirectUri,
                scope: decodedScope,
                state: decodedState,
                error: 'Invalid email or password. Please try again.',
              }),
            );
        } catch { /* fall through to error page */ }
      }

      return reply
        .status(error.statusCode ?? 400)
        .header('Content-Type', HTML_CONTENT_TYPE)
        .header('Cache-Control', 'no-store')
        .send(buildErrorPage(error.message ?? 'Authorization failed'));
    }
  }

  // POST /oauth/token
  async token(
    req: FastifyRequest<{
      Body: {
        client_id?: string;
        client_secret?: string;
        code?: string;
        redirect_uri?: string;
        grant_type?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    const { client_id, client_secret, code, redirect_uri, grant_type } = req.body;

    if (!client_id || !client_secret || !code || !redirect_uri || !grant_type) {
      return reply.status(400).send(
        fail({ name: 'OAuthError', code: 'OAUTH_006', message: 'Missing required parameters', statusCode: 400 }),
      );
    }

    try {
      const result = await this.oauthService.exchangeToken({
        clientId: client_id,
        clientSecret: client_secret,
        code,
        redirectUri: redirect_uri,
        grantType: grant_type,
      });

      return reply
        .header('Cache-Control', 'no-store')
        .send(ok(result));
    } catch (err) {
      const error = err as { statusCode?: number; code?: string; message?: string };
      logger.warn({ err, clientId: client_id }, 'OAuth token exchange failed');
      return reply.status(error.statusCode ?? 400).send(
        fail({ name: 'OAuthError', code: error.code ?? 'OAUTH_ERR', message: error.message ?? 'Token exchange failed', statusCode: error.statusCode ?? 400 }),
      );
    }
  }
}
