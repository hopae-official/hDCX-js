import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY_INDEX = 'credential_keys';

class ExpoSecureStore {
  async getItem(key: string) {
    const result = await SecureStore.getItemAsync(key);
    return result ?? null;
  }

  async setItem(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);

      if (key !== KEY_INDEX) {
        await this.addKeyToIndex(key);
      }
    } catch (error) {
      console.error('[ExpoSecureStore] Error in setItem:', error, key, value);
      throw error;
    }
  }

  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
    if (key !== KEY_INDEX) await this.removeKeyFromIndex(key);
  }

  async clear() {
    const keys = await this.keys();
    for (const key of keys) {
      await SecureStore.deleteItemAsync(key);
    }
    await SecureStore.deleteItemAsync(KEY_INDEX);
  }

  /**
   * Expo Secure Store does not provide an API to list stored keys.
   * To support features like clearing or enumerating stored items,
   * a dedicated key named KEY_INDEX is used to track all stored keys manually.
   */
  async keys() {
    try {
      console.log('[ExpoSecureStore] Fetching stored keys from:', KEY_INDEX);
      const raw = await SecureStore.getItemAsync(KEY_INDEX);

      if (!raw) return [];

      const keys = JSON.parse(raw);
      return keys;
    } catch (error) {
      console.error('[ExpoSecureStore] Error accessing secure storage:', error);
      throw new Error(`Failed to retrieve keys: ${(error as Error).message}`);
    }
  }

  private async addKeyToIndex(key: string): Promise<void> {
    try {
      const keys = await this.keys();

      if (!Array.isArray(keys)) {
        throw new Error('Keys must be an array');
      }

      if (!keys.includes(key)) {
        keys.push(key);
        await SecureStore.setItemAsync(KEY_INDEX, JSON.stringify(keys));
      }
    } catch (error) {
      console.error(
        '[ExpoSecureStore] Error in addKeyToIndex:',
        error,
        'key:',
        key,
      );
      throw new Error(
        `Failed to add key to index: ${(error as Error).message}`,
      );
    }
  }

  private async removeKeyFromIndex(key: string): Promise<void> {
    const keys = await this.keys();
    const updated = keys.filter((k: string) => k !== key);
    await SecureStore.setItemAsync(KEY_INDEX, JSON.stringify(updated));
  }

  generateUUID() {
    return Crypto.randomUUID();
  }
}

export { ExpoSecureStore };
