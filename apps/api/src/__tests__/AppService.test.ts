import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppService } from '../services/AppService.js';
import { AppRepository } from '../repositories/AppRepository.js';
import bcrypt from 'bcrypt';

// Mock bcrypt hash to speed up tests and ensure determinism
mock.method(bcrypt, 'hash', async (data: string) => `hashed_${data}`);

describe('AppService', () => {
  let appService: AppService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      withTransaction: mock.fn(async (cb: any) => cb('mock-client')),
      createApp: mock.fn(async () => {}),
      createApiKey: mock.fn(async () => {}),
      findAppsByDeveloperId: mock.fn(async () => []),
      getAppById: mock.fn(async () => null),
      deleteApp: mock.fn(async () => ({ success: true, clientId: 'client-1' })),
      findActiveAppById: mock.fn(async () => true),
      revokeActiveApiKeys: mock.fn(async () => {}),
      updateRedirectUris: mock.fn(async () => true),
    };
    appService = new AppService(mockRepo as unknown as AppRepository);
  });

  describe('registerApp', () => {
    it('should register an app successfully with encryption enabled', async () => {
      const encryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      process.env['CLIENT_SECRET_ENCRYPTION_KEY'] = encryptionKey;

      const developerId = 'dev-123';
      const name = 'Test App';
      const description = 'My test app';
      const redirectUris = ['http://localhost:3000/callback'];

      const result = await appService.registerApp(developerId, name, description, redirectUris);

      assert.ok(result.id);
      assert.strictEqual(result.name, name);
      assert.strictEqual(result.description, description);
      assert.ok(result.apiKey.startsWith('agk_'));
      assert.ok(result.clientId.startsWith('client_'));
      assert.ok(result.clientSecret.startsWith('secret_'));
      assert.deepStrictEqual(result.redirectUris, redirectUris);

      // Verify repository calls
      assert.strictEqual(mockRepo.withTransaction.mock.calls.length, 1);
      assert.strictEqual(mockRepo.createApp.mock.calls.length, 1);
      assert.strictEqual(mockRepo.createApiKey.mock.calls.length, 1);

      const createAppArgs = mockRepo.createApp.mock.calls[0].arguments;
      assert.strictEqual(createAppArgs[0], 'mock-client');
      assert.strictEqual(createAppArgs[1], result.id);
      assert.strictEqual(createAppArgs[2], developerId);
      assert.strictEqual(createAppArgs[3], name);
      assert.strictEqual(createAppArgs[4], description);
      assert.strictEqual(createAppArgs[5], result.clientId);
      assert.strictEqual(createAppArgs[6], `hashed_${result.clientSecret}`);
      assert.strictEqual(createAppArgs[7], redirectUris);
      assert.ok(typeof createAppArgs[8] === 'string'); // Encrypted secret

      const createApiKeyArgs = mockRepo.createApiKey.mock.calls[0].arguments;
      assert.strictEqual(createApiKeyArgs[0], 'mock-client');
      assert.ok(createApiKeyArgs[1]); // keyId
      assert.strictEqual(createApiKeyArgs[2], result.id);
      assert.strictEqual(createApiKeyArgs[3], `hashed_${result.apiKey}`);

      delete process.env['CLIENT_SECRET_ENCRYPTION_KEY'];
    });

    it('should register an app without encryption if key is missing', async () => {
      delete process.env['CLIENT_SECRET_ENCRYPTION_KEY'];

      const result = await appService.registerApp('dev-123', 'Test App');

      const createAppArgs = mockRepo.createApp.mock.calls[0].arguments;
      assert.strictEqual(createAppArgs[8], null);
    });

    it('should use default empty array for redirectUris if not provided', async () => {
      await appService.registerApp('dev-123', 'Test App');

      const createAppArgs = mockRepo.createApp.mock.calls[0].arguments;
      assert.deepStrictEqual(createAppArgs[7], []);
    });
  });

  describe('listApps', () => {
    it('should return apps for a developer', async () => {
      const mockApps = [{ id: 'app-1', name: 'App 1' }];
      mockRepo.findAppsByDeveloperId.mock.mockImplementation(async () => mockApps);

      const result = await appService.listApps('dev-123');
      assert.deepStrictEqual(result, mockApps);
      assert.strictEqual(mockRepo.findAppsByDeveloperId.mock.calls[0].arguments[0], 'dev-123');
    });
  });

  describe('getApp', () => {
    it('should return an app by id', async () => {
      const mockApp = { id: 'app-1', name: 'App 1' };
      mockRepo.getAppById.mock.mockImplementation(async () => mockApp);

      const result = await appService.getApp('app-1', 'dev-123');
      assert.deepStrictEqual(result, mockApp);
      assert.strictEqual(mockRepo.getAppById.mock.calls[0].arguments[0], 'dev-123');
      assert.strictEqual(mockRepo.getAppById.mock.calls[0].arguments[1], 'app-1');
    });
  });

  describe('deleteApp', () => {
    it('should delete an app', async () => {
      const mockResult = { success: true, clientId: 'client-1' };
      mockRepo.deleteApp.mock.mockImplementation(async () => mockResult);

      const result = await appService.deleteApp('app-1', 'dev-123');
      assert.deepStrictEqual(result, mockResult);
      assert.strictEqual(mockRepo.deleteApp.mock.calls[0].arguments[0], 'app-1');
      assert.strictEqual(mockRepo.deleteApp.mock.calls[0].arguments[1], 'dev-123');
    });
  });

  describe('rotateApiKey', () => {
    it('should rotate API key successfully if app exists', async () => {
      mockRepo.findActiveAppById.mock.mockImplementation(async () => true);

      const result = await appService.rotateApiKey('app-1', 'dev-123');
      assert.ok(result?.apiKey.startsWith('agk_'));

      assert.strictEqual(mockRepo.withTransaction.mock.calls.length, 1);
      assert.strictEqual(mockRepo.findActiveAppById.mock.calls.length, 1);
      assert.strictEqual(mockRepo.revokeActiveApiKeys.mock.calls.length, 1);
      assert.strictEqual(mockRepo.createApiKey.mock.calls.length, 1);

      const createApiKeyArgs = mockRepo.createApiKey.mock.calls[0].arguments;
      assert.strictEqual(createApiKeyArgs[0], 'mock-client');
      assert.strictEqual(createApiKeyArgs[2], 'app-1');
      assert.strictEqual(createApiKeyArgs[3], `hashed_${result?.apiKey}`);
    });

    it('should return null if app does not exist', async () => {
      mockRepo.findActiveAppById.mock.mockImplementation(async () => false);

      const result = await appService.rotateApiKey('app-1', 'dev-123');
      assert.strictEqual(result, null);
      assert.strictEqual(mockRepo.revokeActiveApiKeys.mock.calls.length, 0);
      assert.strictEqual(mockRepo.createApiKey.mock.calls.length, 0);
    });
  });

  describe('updateRedirectUris', () => {
    it('should update redirect URIs', async () => {
      mockRepo.updateRedirectUris.mock.mockImplementation(async () => true);
      const uris = ['http://new-uri'];

      const result = await appService.updateRedirectUris('app-1', 'dev-123', uris);
      assert.strictEqual(result, true);
      assert.strictEqual(mockRepo.updateRedirectUris.mock.calls[0].arguments[0], 'app-1');
      assert.strictEqual(mockRepo.updateRedirectUris.mock.calls[0].arguments[1], 'dev-123');
      assert.strictEqual(mockRepo.updateRedirectUris.mock.calls[0].arguments[2], uris);
    });
  });
});
