import type { Pool } from 'pg';

export class AppRepository {
  constructor(private readonly db: Pool) {}

  async findClientSecretEncByClientId(clientId: string): Promise<string | null> {
    const result = await this.db.query<{ client_secret_enc: string | null }>(
      `SELECT client_secret_enc FROM registered_apps
       WHERE client_id = $1 AND is_active = true`,
      [clientId],
    );
    return result.rows[0]?.client_secret_enc ?? null;
  }

  async findApiKeyHashesByAppId(appId: string): Promise<string[]> {
    const result = await this.db.query<{ key_hash: string }>(
      `SELECT ak.key_hash
       FROM api_keys ak
       INNER JOIN registered_apps ra ON ra.id = ak.app_id
       WHERE ra.id = $1
         AND ra.is_active = true
         AND ak.revoked_at IS NULL
       ORDER BY ak.created_at DESC`,
      [appId],
    );
    return result.rows.map((r) => r.key_hash);
  }

  async isAppActive(appId: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT id FROM registered_apps WHERE id = $1 AND is_active = true',
      [appId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
