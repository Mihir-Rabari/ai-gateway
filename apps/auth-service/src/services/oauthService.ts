import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { Errors } from '@ai-gateway/utils';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { AuthService } from './authService.js';

// OAuth-specific errors
const OAuthErrors = {
  INVALID_CLIENT: () => Object.assign(
    new Error('Invalid client_id or client_secret'),
    { statusCode: 401, code: 'OAUTH_001' },
  ),
  INVALID_REDIRECT_URI: () => Object.assign(
    new Error('redirect_uri does not match registered URIs'),
    { statusCode: 400, code: 'OAUTH_002' },
  ),
  INVALID_GRANT: () => Object.assign(
    new Error('Authorization code is invalid or expired'),
    { statusCode: 400, code: 'OAUTH_003' },
  ),
  UNSUPPORTED_RESPONSE_TYPE: () => Object.assign(
    new Error('Only response_type=code is supported'),
    { statusCode: 400, code: 'OAUTH_004' },
  ),
  UNSUPPORTED_GRANT_TYPE: () => Object.assign(
    new Error('Only grant_type=authorization_code is supported'),
    { statusCode: 400, code: 'OAUTH_005' },
  ),
  MISSING_PARAMS: (msg: string) => Object.assign(
    new Error(msg),
    { statusCode: 400, code: 'OAUTH_006' },
  ),
};

export { OAuthErrors };

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope?: string;
  state?: string;
}

export interface TokenRequest {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  grantType: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    planId: string;
  };
}

export class OAuthService {
  private readonly oauthRepo: OAuthRepository;
  private readonly authService: AuthService;

  constructor(db: Pool, redis: Redis) {
    this.oauthRepo = new OAuthRepository(db, redis);
    this.authService = new AuthService(db, redis);
  }

  /**
   * Validate the /oauth/authorize request params.
   * Returns the app name so the login form can display it.
   */
  async validateAuthorizeRequest(params: AuthorizeParams): Promise<{ appName: string }> {
    if (!params.clientId) throw OAuthErrors.MISSING_PARAMS('client_id is required');
    if (!params.redirectUri) throw OAuthErrors.MISSING_PARAMS('redirect_uri is required');
    if (params.responseType !== 'code') throw OAuthErrors.UNSUPPORTED_RESPONSE_TYPE();

    const app = await this.oauthRepo.findAppByClientId(params.clientId);
    if (!app) throw OAuthErrors.INVALID_CLIENT();

    if (!this.isRedirectUriAllowed(app.redirectUris, params.redirectUri)) {
      throw OAuthErrors.INVALID_REDIRECT_URI();
    }

    return { appName: app.name };
  }

  /**
   * Authenticate the user and issue an auth code.
   * Called after the user submits the login form on the consent page.
   */
  async authorizeUser(params: {
    clientId: string;
    redirectUri: string;
    scope: string;
    state: string;
    email: string;
    password: string;
  }): Promise<{ redirectUrl: string }> {
    // Validate app + redirect URI
    const app = await this.oauthRepo.findAppByClientId(params.clientId);
    if (!app) throw OAuthErrors.INVALID_CLIENT();
    if (!this.isRedirectUriAllowed(app.redirectUris, params.redirectUri)) {
      throw OAuthErrors.INVALID_REDIRECT_URI();
    }

    // Authenticate user credentials
    const authResult = await this.authService.login({
      email: params.email,
      password: params.password,
    });

    // Generate auth code
    const code = randomBytes(24).toString('base64url');
    await this.oauthRepo.storeAuthCode(code, {
      clientId: params.clientId,
      userId: authResult.user.id,
      redirectUri: params.redirectUri,
      scope: params.scope || 'basic',
    });

    // Build redirect URL
    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set('code', code);
    if (params.state) redirectUrl.searchParams.set('state', params.state);

    return { redirectUrl: redirectUrl.toString() };
  }

  /**
   * Exchange an authorization code for access + refresh tokens.
   * POST /oauth/token
   */
  async exchangeToken(request: TokenRequest): Promise<TokenResponse> {
    if (request.grantType !== 'authorization_code') {
      throw OAuthErrors.UNSUPPORTED_GRANT_TYPE();
    }

    // Validate client
    const app = await this.oauthRepo.findAppByClientId(request.clientId);
    if (!app) throw OAuthErrors.INVALID_CLIENT();

    const secretValid = await bcrypt.compare(request.clientSecret, app.clientSecretHash);
    if (!secretValid) throw OAuthErrors.INVALID_CLIENT();

    // Consume (single-use) auth code
    const codeData = await this.oauthRepo.consumeAuthCode(request.code);
    if (!codeData) throw OAuthErrors.INVALID_GRANT();

    // Validate code belongs to this client and redirect URI matches
    if (codeData.clientId !== request.clientId) throw OAuthErrors.INVALID_GRANT();
    if (codeData.redirectUri !== request.redirectUri) throw OAuthErrors.INVALID_GRANT();

    // Issue tokens via AuthService
    const user = await this.authService.getUserById(codeData.userId);
    if (!user) throw Errors.USER_NOT_FOUND();

    const tokens = await this.authService.issueTokensForUser(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60, // 15 minutes
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planId: user.planId,
      },
    };
  }

  // ─────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────

  private isRedirectUriAllowed(registered: string[], requested: string): boolean {
    return registered.some((uri) => uri === requested);
  }
}
