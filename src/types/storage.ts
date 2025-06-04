import { rawDCQL } from './credential';

export interface IWalletStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
  keys?(): Promise<string[]>;
}

export interface ICredentialStore {
  saveCredential(credential: string): Promise<void>;
  getCredentialById(id: string): Promise<string | null>;
  deleteCredential(id: string): Promise<void>;
  listCredentials(filter?: rawDCQL): Promise<string[]>;
}
