import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorage } from '../storage/in-memory-storage';
import CredentialStore from '../credentials/credential-store';

describe('CredentialStore', () => {
  let storage: InMemoryStorage;
  let credentialStore: CredentialStore;

  beforeEach(() => {
    storage = new InMemoryStorage();
    credentialStore = new CredentialStore(storage);
  });

  describe('saveCredential', () => {
    it('should save a credential and generate a unique id', async () => {
      const credential = 'test-credential';
      await credentialStore.saveCredential(credential);

      const keys = await storage.keys();
      expect(keys).toHaveLength(1);
      expect(keys[0]).toMatch(/^credential:/);
    });
  });

  describe('getCredentialById', () => {
    it('should return null for non-existent credential', async () => {
      const result = await credentialStore.getCredentialById('non-existent');
      expect(result).toBeNull();
    });

    it('should retrieve a saved credential', async () => {
      const credential = 'test-credential';
      await storage.setItem('credential:test-id', JSON.stringify(credential));

      const result = await credentialStore.getCredentialById('test-id');
      expect(result).toBe(credential);
    });
  });

  describe('deleteCredential', () => {
    it('should delete an existing credential', async () => {
      await storage.setItem(
        'credential:test-id',
        JSON.stringify('test-credential'),
      );
      await credentialStore.deleteCredential('test-id');

      const keys = await storage.keys();
      expect(keys).toHaveLength(0);
    });

    it('should not throw when deleting non-existent credential', async () => {
      await expect(
        credentialStore.deleteCredential('non-existent'),
      ).resolves.not.toThrow();
    });
  });

  describe('listCredentials', () => {
    it('should return empty array when no credentials exist', async () => {
      const result = await credentialStore.listCredentials();
      expect(result).toEqual([]);
    });

    // Note: More tests should be added here when listCredentials is implemented
  });
});
