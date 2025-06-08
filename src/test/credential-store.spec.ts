import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorage } from '../storage/in-memory-storage';
import CredentialStore from '../credentials/credential-store';
import { rawDCQL } from '@vdcs/dcql';

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

  describe('CredentialStore - listCredentials with DCQL', () => {
    const mockCredential1 = {
      vct: 'vct-1',
      name: 'Alice',
    };

    const mockCredential2 = {
      vct: 'vct-2',
      name: 'Bob',
    };

    beforeEach(async () => {
      await credentialStore.saveCredential(JSON.stringify(mockCredential1));
      await credentialStore.saveCredential(JSON.stringify(mockCredential2));
    });

    const query: rawDCQL = {
      credentials: [
        {
          id: 'cred-1',
          format: 'dc+sd-jwt',
          meta: { vct_value: 'vct-1' }, // matches only mockCredential1
          claims: [],
        },
      ],
      credential_sets: [
        {
          options: [['cred-1']],
          required: true,
        },
      ],
    };

    it('returns all credentials when no query is given', async () => {
      const result = await credentialStore.listCredentials();

      expect(result).toHaveLength(2);
      expect(result.some((c) => JSON.parse(c).vct === 'vct-1')).toBe(true);
      expect(result.some((c) => JSON.parse(c).vct === 'vct-2')).toBe(true);
    });

    it('filters credentials based on DCQL query', async () => {
      const result = await credentialStore.listCredentials(query);
      expect(result).toHaveLength(1);
      const parsed = JSON.parse(result[0]);
      expect(parsed.vct).toBe('vct-1');
      expect(parsed.name).toBe('Alice');
    });

    it('returns empty if no credential matches the query', async () => {
      const noMatchQuery: rawDCQL = {
        credentials: [
          {
            id: 'cred-x',
            format: 'dc+sd-jwt',
            meta: { vct_value: 'non-existent' },
            claims: [],
          },
        ],
        credential_sets: [
          {
            options: [['cred-x']],
            required: true,
          },
        ],
      };

      const result = await credentialStore.listCredentials(noMatchQuery);
      expect(result).toHaveLength(0);
    });
  });
});
