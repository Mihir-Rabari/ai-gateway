import type { Pool } from 'pg';
import type Redis from 'ioredis';

export interface OAuthApp {
  id: string;
  developerId: string;
  name: string;
  clientId: string;
  clientSecretHash: string;
  redirectUris: string[];
}

export interface AuthCodeData {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
}

// Authorization code TTL — 5 minutes.
// Per RFC 6749 §4.1.2: "Authorization codes MUST be short lived" and
// "MUST be single-use". Single-use enforcement is in consumeAuthCode().
const AUTH_CODE_TTL_SECONDS = 5 * 60;

function parseRedirectUris(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return [];
}

export class OAuthRepository {
  constructor(
    private readonly db: Pool,
    private readonly redis: Redis,
  ) {}

  async findAppByClientId(clientId: string): Promise<OAuthApp | null> {
    const result = await this.db.query<{
      id: string;
      developer_id: string;
      name: string;
      client_id: string;
      client_secret_hash: string;
      redirect_uris: string[];
    }>(
      `SELECT id, developer_id, name, client_id, client_secret_hash, redirect_uris
       FROM registered_apps
       WHERE client_id = $1 AND is_active = true`,
      [clientId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      developerId: row.developer_id,
      name: row.name,
      clientId: row.client_id,
      clientSecretHash: row.client_secret_hash,
      redirectUris: parseRedirectUris(row.redirect_uris),
    };
  }

  // ─────────────────────────────────────────
  // Auth Codes (stored in Redis with TTL)
  // ─────────────────────────────────────────

  async storeAuthCode(code: string, data: AuthCodeData): Promise<void> {
    await this.redis.setex(
      `oauth_code:${code}`,
      AUTH_CODE_TTL_SECONDS,
      JSON.stringify(data),
    );
  }

  /** Atomically retrieve and delete the code (single-use). Returns null if missing/expired. */
  async consumeAuthCode(code: string): Promise<AuthCodeData | null> {
    const key = `oauth_code:${code}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    await this.redis.del(key);
    return JSON.parse(raw) as AuthCodeData;
  }
}
