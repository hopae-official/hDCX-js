import { rawDCQL } from '../types/credential';

import { v4 as uuidv4 } from 'uuid';
import { ICredentialStore, IWalletStorage } from '../types/storage';
import { DCQL } from '@vdcs/dcql';

class CredentialStore implements ICredentialStore {
  constructor(private storage: IWalletStorage) {}

  private buildKey(id: string) {
    return `credential:${id}`;
  }

  async saveCredential(credential: string): Promise<void> {
    await this.storage.setItem(this.buildKey(uuidv4()), credential);
  }

  async getCredentialById(id: string): Promise<string | null> {
    const raw = await this.storage.getItem(this.buildKey(id));
    return raw ? JSON.parse(raw) : null;
  }

  async deleteCredential(id: string): Promise<void> {
    await this.storage.removeItem(this.buildKey(id));
  }

  async listCredentials(query?: rawDCQL): Promise<string[]> {
    const keys = (await this.storage.keys?.()) || [];
    const credentialKeys = keys.filter((k) => k.startsWith('credential:'));

    const rawCredentials: Record<string, unknown>[] = [];

    for (const key of credentialKeys) {
      const raw = await this.storage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        rawCredentials.push(parsed);
      } catch {
        continue;
      }
    }

    if (!query) {
      return rawCredentials.map((c) => JSON.stringify(c));
    }

    const dcql = DCQL.parse(query);
    const result = dcql.match(rawCredentials);

    if (!result.match || !result.matchedCredentials) {
      return [];
    }

    return result.matchedCredentials.map((m) => JSON.stringify(m.credential));
  }
}

export default CredentialStore;
