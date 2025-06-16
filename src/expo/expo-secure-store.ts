import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY_INDEX = 'credential_keys';
const CHUNK_SIZE = 1950; // under 2KB
const CHUNK_PREFIX = 'chunk_';

class ExpoSecureStore {
  async getItem(key: string) {
    try {
      const metadataStr = await SecureStore.getItemAsync(`${key}_meta`);

      if (!metadataStr) {
        const value = await SecureStore.getItemAsync(key);
        return value;
      }

      const metadata = JSON.parse(metadataStr);
      const { totalChunks } = metadata;

      let reconstructedString = '';
      for (let i = 0; i < totalChunks; i++) {
        const chunk = await SecureStore.getItemAsync(
          `${CHUNK_PREFIX}${key}_${i}`,
        );
        if (!chunk) {
          throw new Error(`Missing chunk ${i} for key ${key}`);
        }
        reconstructedString += chunk;
      }

      return reconstructedString;
    } catch (e) {
      throw new Error(
        `Failed to get item: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async setItem(key: string, value: string) {
    try {
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
      } else {
        const totalSize = value.length;
        const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

        const metadata = {
          totalChunks,
          totalSize,
        };

        await SecureStore.setItemAsync(`${key}_meta`, JSON.stringify(metadata));

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, totalSize);
          const chunk = value.slice(start, end);
          await SecureStore.setItemAsync(`${CHUNK_PREFIX}${key}_${i}`, chunk);
        }
      }

      if (key !== KEY_INDEX) {
        await this.addKeyToIndex(key);
      }
    } catch (e) {
      throw new Error(
        `Failed to set item: ${e instanceof Error ? e.message : String(e)}`,
      );
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
      const raw = await SecureStore.getItemAsync(KEY_INDEX);

      if (!raw) return [];

      const keys = JSON.parse(raw);
      return keys;
    } catch (e) {
      throw new Error(
        `Failed to retrieve keys: ${e instanceof Error ? e.message : String(e)}`,
      );
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
