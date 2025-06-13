import { IWalletStorage } from '../types/storage';
import { v4 as uuidv4 } from 'uuid';

class InMemoryStorage implements IWalletStorage {
  private store = new Map<string, string>();

  async getItem(key: string) {
    return this.store.get(key) || null;
  }

  async setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  async removeItem(key: string) {
    this.store.delete(key);
  }

  async clear() {
    this.store.clear();
  }

  async keys() {
    return Array.from(this.store.keys());
  }

  generateUUID() {
    return uuidv4();
  }
}

export { InMemoryStorage };
