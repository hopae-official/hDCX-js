import { DCQL, rawDCQL } from '@vdcs/dcql';
import { Format } from '@vdcs/oid4vci';
import { decodeSDJWT } from '../utils';
import { IWalletStorage } from '../types/storage';

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
  }): Promise<string | void> {
    try {
      const id = this.storage.generateUUID();
      const jsonString = JSON.stringify({ credential, format });

      await this.storage.setItem(this.buildKey(id), jsonString);
      return id;
    } catch (e) {
      throw new Error(
        `Failed to save credential: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async getCredentialById(id: string): Promise<string | null> {
    try {
      const jsonString = await this.storage.getItem(this.buildKey(id));
      if (!jsonString) return null;
      return jsonString;
    } catch (e) {
      throw new Error(
        `Failed to get credential: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async deleteCredential(id: string): Promise<void> {
    try {
      await this.storage.removeItem(this.buildKey(id));
    } catch (e) {
      throw new Error(
        `Failed to delete credential: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async listCredentials(query?: rawDCQL): Promise<string> {
    const keys = (await this.storage.keys?.()) || [];
    const credentialKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
    const rawCredentials: Record<string, unknown>[] = [];

    for (const key of credentialKeys) {
      try {
        const jsonString = await this.storage.getItem(key);
        if (!jsonString) continue;

        const { credential, format } = JSON.parse(jsonString);

        if (format === 'dc+sd-jwt') {
          const decoded = decodeSDJWT(credential);
          const claims = decoded.claims as Record<string, unknown>;
          rawCredentials.push({
            raw: credential,
            ...claims,
          });
        } else {
          throw new Error('Unsupported format');
        }
      } catch (e) {
        // @Todo: Handle partial success on v0.2
        throw new Error(
          `Failed to parse credential: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (!query) {
      return JSON.stringify(rawCredentials);
    }

    const dcql = DCQL.parse(query);
    const result = dcql.match(rawCredentials);

    if (!result.match || !result.matchedCredentials) {
      return JSON.stringify([]);
    }

    return JSON.stringify(result.matchedCredentials.map((m) => m.credential));
  }

  clear() {
    this.storage.clear?.();
  }
}

export default CredentialStore;
