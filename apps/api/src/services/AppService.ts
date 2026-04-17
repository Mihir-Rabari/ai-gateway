import { AppRepository } from '../repositories/AppRepository.js';
import { generateId, encryptClientSecret } from '@ai-gateway/utils';
import bcrypt from 'bcrypt';

export class AppService {
  private repo: AppRepository;

  constructor(repo: AppRepository) {
    this.repo = repo;
  }

  async registerApp(developerId: string, name: string, description?: string, redirectUris: string[] = []) {
    const appId = generateId();
    const rawApiKey = `agk_${generateId()}${generateId()}`;
    const keyId = generateId();
    const keyHash = await bcrypt.hash(rawApiKey, 10);

    // OAuth credentials
    const clientId = `client_${generateId()}`;
    const rawClientSecret = `secret_${generateId()}${generateId()}`;
    const clientSecretHash = await bcrypt.hash(rawClientSecret, 10);

    // Encrypt the raw secret for later retrieval during JWT verification.
    // Requires CLIENT_SECRET_ENCRYPTION_KEY (64-char hex / 32-byte AES key).
    const encKey = process.env['CLIENT_SECRET_ENCRYPTION_KEY'];
    const clientSecretEnc = encKey ? encryptClientSecret(rawClientSecret, encKey) : null;

    await this.repo.withTransaction(async (client) => {
      await this.repo.createApp(client, appId, developerId, name, description ?? null, clientId, clientSecretHash, redirectUris, clientSecretEnc);
      await this.repo.createApiKey(client, keyId, appId, keyHash);
    });

    return {
      id: appId,
      name,
      description,
      apiKey: rawApiKey,
      clientId,
      clientSecret: rawClientSecret,
      redirectUris,
    };
  }

  async listApps(developerId: string) {
    return this.repo.findAppsByDeveloperId(developerId);
  }

  async getApp(appId: string, developerId: string) {
    return this.repo.getAppById(developerId, appId);
  }

  async isAppOwner(appId: string, developerId: string) {
    return this.repo.isAppOwner(appId, developerId);
  }

  async deleteApp(appId: string, developerId: string): Promise<{ success: boolean; clientId: string | null }> {
    return this.repo.deleteApp(appId, developerId);
  }

  async rotateApiKey(appId: string, developerId: string) {
    const rawApiKey = `agk_${generateId()}${generateId()}`;
    const keyId = generateId();
    const keyHash = await bcrypt.hash(rawApiKey, 10);

    const success = await this.repo.withTransaction(async (client) => {
      const exists = await this.repo.findActiveAppById(client, appId, developerId);
      if (!exists) {
        return false;
      }

      await this.repo.revokeActiveApiKeys(client, appId);
      await this.repo.createApiKey(client, keyId, appId, keyHash);
      return true;
    });

    if (!success) {
      return null;
    }

    return { apiKey: rawApiKey };
  }

  async updateRedirectUris(appId: string, developerId: string, redirectUris: string[]) {
    return this.repo.updateRedirectUris(appId, developerId, redirectUris);
  }
}
