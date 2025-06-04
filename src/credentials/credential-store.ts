import { rawDCQL } from '../types/credential';

import { v4 as uuidv4 } from 'uuid';
import { ICredentialStore, IWalletStorage } from '../types/storage';

class CredentialStore implements ICredentialStore {
  constructor(private storage: IWalletStorage) {}

  private buildKey(id: string) {
    return `credential:${id}`;
  }

  async saveCredential(credential: string): Promise<void> {
    await this.storage.setItem(
      this.buildKey(uuidv4()),
      JSON.stringify(credential),
    );
  }

  async getCredentialById(id: string): Promise<string | null> {
    const raw = await this.storage.getItem(this.buildKey(id));
    return raw ? JSON.parse(raw) : null;
  }

  async deleteCredential(id: string): Promise<void> {
    await this.storage.removeItem(this.buildKey(id));
  }

  async listCredentials(query?: rawDCQL): Promise<string[]> {
    //Todo: implement
    return [];
  }
}

export default CredentialStore;
