import { rawDCQL } from '../types/credential';

import { IWalletStorage } from '../types/storage';
import { DCQL } from '@vdcs/dcql';
import { Format } from '@vdcs/oid4vci';
import { decodeSDJWT } from '../utils';

const KEY_PREFIX = 'credential.';

class CredentialStore {
  constructor(private storage: IWalletStorage) {}

  private buildKey(id: string) {
    return `${KEY_PREFIX}${id}`;
  }

  async saveCredential({
    credential,
    format,
  }: {
    credential: string;
    format: Format;
  }): Promise<void> {
    try {
      await this.storage.setItem(
        this.buildKey(this.storage.generateUUID()),
        JSON.stringify({ credential, format }),
      );
    } catch (error) {
      throw new Error(`Failed to save credential: ${(error as Error).message}`);
    }
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
    const credentialKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));

    const rawCredentials: Record<string, unknown>[] = [];

    for (const key of credentialKeys) {
      const raw = await this.storage.getItem(key);
      if (!raw) continue;

      try {
        const { credential, format } = JSON.parse(raw);

        if (format === 'dc+sd-jwt') {
          const decoded = decodeSDJWT(credential);
          rawCredentials.push(decoded.claims as Record<string, unknown>);
        } else {
          throw new Error('Unsupported format');
        }
      } catch (e) {
        console.error('Failed to parse credential:', e);
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

  clear() {
    this.storage.clear?.();
  }
}

export default CredentialStore;
