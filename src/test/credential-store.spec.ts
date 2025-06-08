import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorage } from '../storage/in-memory-storage';
import CredentialStore from '../credentials/credential-store';
import { rawDCQL } from '@vdcs/dcql';
import { decodeSDJWT } from '../utils';

describe('CredentialStore', () => {
  let storage: InMemoryStorage;
  let credentialStore: CredentialStore;
  // VC claims: { vct: 'IdentityCredential', ...}
  const mockSDJWTCredential =
    'eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFZERTQSIsImtpZCI6IiN6Nk1rdHF0WE5HOENEVVk5UHJydG9TdEZ6ZUNuaHBNbWd4WUwxZ2lrY1czQnp2TlcifQ.eyJ2Y3QiOiJJZGVudGl0eUNyZWRlbnRpYWwiLCJmYW1pbHlfbmFtZSI6IkRvZSIsInBob25lX251bWJlciI6IisxLTIwMi01NTUtMDEwMSIsImFkZHJlc3MiOnsic3RyZWV0X2FkZHJlc3MiOiIxMjMgTWFpbiBTdCIsImxvY2FsaXR5IjoiQW55dG93biIsIl9zZCI6WyJOSm5tY3QwQnFCTUUxSmZCbEM2alJRVlJ1ZXZwRU9OaVl3N0E3TUh1SnlRIiwib201Wnp0WkhCLUdkMDBMRzIxQ1ZfeE00RmFFTlNvaWFPWG5UQUpOY3pCNCJdfSwiY25mIjp7Imp3ayI6eyJrdHkiOiJPS1AiLCJjcnYiOiJFZDI1NTE5IiwieCI6Im9FTlZzeE9VaUg1NFg4d0pMYVZraWNDUmswMHdCSVE0c1JnYms1NE44TW8ifX0sImlzcyI6ImRpZDprZXk6ejZNa3RxdFhORzhDRFVZOVBycnRvU3RGemVDbmhwTW1neFlMMWdpa2NXM0J6dk5XIiwiaWF0IjoxNjk4MTUxNTMyLCJfc2QiOlsiMUN1cjJrMkEyb0lCNUNzaFNJZl9BX0tnLWwyNnVfcUt1V1E3OVAwVmRhcyIsIlIxelRVdk9ZSGdjZXBqMGpIeXBHSHo5RUh0dFZLZnQweXN3YmM5RVRQYlUiLCJlRHFRcGRUWEpYYldoZi1Fc0k3enc1WDZPdlltRk4tVVpRUU1lc1h3S1B3IiwicGREazJfWEFLSG83Z09BZndGMWI3T2RDVVZUaXQya0pIYXhTRUNROXhmYyIsInBzYXVLVU5XRWkwOW51M0NsODl4S1hnbXBXRU5abDV1eTFOMW55bl9qTWsiLCJzTl9nZTBwSFhGNnFtc1luWDFBOVNkd0o4Y2g4YUVOa3hiT0RzVDc0WXdJIl0sIl9zZF9hbGciOiJzaGEtMjU2In0.Kkhrxy2acd52JTl4g_0x25D5d1QNCTbqHrD9Qu9HzXMxPMu_5T4z-cSiutDYb5cIdi9NzMXPe4MXax-fUymEDg~WyJzYWx0IiwicmVnaW9uIiwiQW55c3RhdGUiXQ~WyJzYWx0IiwiY291bnRyeSIsIlVTIl0~WyJzYWx0IiwiZ2l2ZW5fbmFtZSIsIkpvaG4iXQ~WyJzYWx0IiwiZW1haWwiLCJqb2huZG9lQGV4YW1wbGUuY29tIl0~WyJzYWx0IiwiYmlydGhkYXRlIiwiMTk0MC0wMS0wMSJd~WyJzYWx0IiwiaXNfb3Zlcl8xOCIsdHJ1ZV0~WyJzYWx0IiwiaXNfb3Zlcl8yMSIsdHJ1ZV0~WyJzYWx0IiwiaXNfb3Zlcl82NSIsdHJ1ZV0~';

  beforeEach(() => {
    storage = new InMemoryStorage();
    credentialStore = new CredentialStore(storage);
  });

  describe('saveCredential', () => {
    it('should save a credential and generate a unique id', async () => {
      await credentialStore.saveCredential({
        credential: mockSDJWTCredential,
        format: 'dc+sd-jwt',
      });

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
    beforeEach(async () => {
      await credentialStore.saveCredential({
        credential: mockSDJWTCredential,
        format: 'dc+sd-jwt',
      });
    });

    const query: rawDCQL = {
      credentials: [
        {
          id: 'cred-1',
          format: 'dc+sd-jwt',
          meta: { vct_value: 'IdentityCredential' }, // matches only mockCredential1
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

      expect(result).toHaveLength(1);
      expect(
        result.some((c) => JSON.parse(c).vct === 'IdentityCredential'),
      ).toBe(true);
    });

    it('filters credentials based on DCQL query', async () => {
      const result = await credentialStore.listCredentials(query);
      expect(result).toHaveLength(1);
      const parsed = JSON.parse(result[0]);
      expect(parsed.vct).toBe('IdentityCredential');
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
