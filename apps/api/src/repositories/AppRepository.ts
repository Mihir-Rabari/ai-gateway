import { Pool, PoolClient } from 'pg';

export interface AppRow {
  id: string;
  name: string;
  description: string | null;
  clientId: string | null;
  redirectUris: string[];
  isActive: boolean;
  createdAt: Date;
}

export class AppRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async createApp(
    client: PoolClient,
    appId: string,
    developerId: string,
    name: string,
    description: string | null,
    clientId: string,
    clientSecretHash: string,
    redirectUris: string[],
  ): Promise<void> {
    await client.query(
      `INSERT INTO registered_apps (id, developer_id, name, description, client_id, client_secret_hash, redirect_uris)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [appId, developerId, name, description, clientId, clientSecretHash, JSON.stringify(redirectUris)],
    );
  }

  async createApiKey(client: PoolClient, keyId: string, appId: string, keyHash: string): Promise<void> {
    await client.query(
      `INSERT INTO api_keys (id, app_id, key_hash) VALUES ($1, $2, $3)`,
      [keyId, appId, keyHash],
    );
  }

  async findAppsByDeveloperId(developerId: string): Promise<AppRow[]> {
    const result = await this.pool.query<AppRow>(
      `SELECT id, name, description, client_id as "clientId",
              redirect_uris as "redirectUris", is_active as "isActive", created_at as "createdAt"
       FROM registered_apps
       WHERE developer_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [developerId],
    );
    return result.rows.map((r) => ({
      ...r,
      redirectUris: Array.isArray(r.redirectUris)
        ? r.redirectUris
        : JSON.parse(String(r.redirectUris) || '[]'),
    }));
  }

  async deleteApp(appId: string, developerId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE registered_apps SET is_active = false WHERE id = $1 AND developer_id = $2 RETURNING id`,
      [appId, developerId],
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async findActiveAppById(client: PoolClient, appId: string, developerId: string): Promise<boolean> {
    const result = await client.query(
      `SELECT id FROM registered_apps WHERE id = $1 AND developer_id = $2 AND is_active = true`,
      [appId, developerId],
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async revokeActiveApiKeys(client: PoolClient, appId: string): Promise<void> {
    await client.query(
      `UPDATE api_keys SET revoked_at = NOW() WHERE app_id = $1 AND revoked_at IS NULL`,
      [appId],
    );
  }

  async updateRedirectUris(appId: string, developerId: string, redirectUris: string[]): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE registered_apps SET redirect_uris = $1 WHERE id = $2 AND developer_id = $3 AND is_active = true RETURNING id`,
      [JSON.stringify(redirectUris), appId, developerId],
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}
