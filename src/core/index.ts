import CredentialStore from '../credentials/credential-store';
import { InMemoryStorage } from '../storage';
import { ICredentialStore, IWalletStorage } from '../types/storage';
import { Oid4VciClient } from '@vdcs/oid4vci-client';
import { type EcPrivateJwk } from '@vdcs/jwt';
import { type CredentialResponse } from '@vdcs/oid4vci';

class WalletSDK {
  credentialStore: ICredentialStore;
  jwk: EcPrivateJwk;

  constructor({
    storage,
    jwk,
  }: {
    storage: IWalletStorage;
    jwk: EcPrivateJwk;
  }) {
    this.credentialStore = new CredentialStore(
      storage || new InMemoryStorage(),
    );
    this.jwk = jwk;
  }

  async request(offerUri: string): Promise<CredentialResponse> {
    const client = await Oid4VciClient.fromOfferUrl(offerUri);
    const credential = await client.getCredential({
      credential_configuration_id:
        client.credentialOffer.credential_configuration_ids[0],
      privateKey: this.jwk,
    });

    return credential;
  }
}

export { WalletSDK };
