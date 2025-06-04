import CredentialStore from '../credentials/credential-store';
import { InMemoryStorage } from '../storage';
import { ICredentialStore, IWalletStorage } from '../types/storage';

class WalletSDK {
  credentialStore: ICredentialStore;

  constructor({ storage }: { storage: IWalletStorage }) {
    this.credentialStore = new CredentialStore(
      storage || new InMemoryStorage(),
    );
  }
}

export { WalletSDK };
