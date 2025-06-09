import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpoSecureStore } from '..';
import * as SecureStore from 'expo-secure-store';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

describe('ExpoSecureStore', () => {
  let store: ExpoSecureStore;

  beforeEach(() => {
    store = new ExpoSecureStore();
    vi.clearAllMocks();
  });

  describe('getItem', () => {
    it('should return null when key does not exist', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
      const result = await store.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('should return value when key exists', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('value');
      const result = await store.getItem('key');
      expect(result).toBe('value');
    });
  });

  describe('setItem', () => {
    it('should store value and update key index', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('[]');
      await store.setItem('key', 'value');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('key', 'value');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'credential_keys',
        '["key"]',
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item and update key index', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('["key"]');
      await store.removeItem('key');

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'credential_keys',
        '[]',
      );
    });
  });

  describe('clear', () => {
    it('should remove all items including key index', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('["key1", "key2"]');
      await store.clear();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key1');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('key2');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'credential_keys',
      );
    });
  });

  describe('keys', () => {
    it('should return empty array when no keys exist', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
      const keys = await store.keys();
      expect(keys).toEqual([]);
    });

    it('should return array of keys when keys exist', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('["key1", "key2"]');
      const keys = await store.keys();
      expect(keys).toEqual(['key1', 'key2']);
    });
  });
});
