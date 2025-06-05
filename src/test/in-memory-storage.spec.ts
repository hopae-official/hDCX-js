import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorage } from '../storage/in-memory-storage';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  describe('setItem and getItem', () => {
    it('should store and retrieve values correctly', async () => {
      await storage.setItem('key1', 'value1');
      const value = await storage.getItem('key1');
      expect(value).toBe('value1');
    });

    it('should return null for non-existent key', async () => {
      const value = await storage.getItem('nonexistent');
      expect(value).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove stored item', async () => {
      await storage.setItem('key1', 'value1');
      await storage.removeItem('key1');
      const value = await storage.getItem('key1');
      expect(value).toBeNull();
    });

    it('should not throw error when removing non-existent key', async () => {
      await expect(storage.removeItem('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all stored items', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');
      await storage.clear();

      const value1 = await storage.getItem('key1');
      const value2 = await storage.getItem('key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('keys', () => {
    it('should return all stored keys', async () => {
      await storage.setItem('key1', 'value1');
      await storage.setItem('key2', 'value2');

      const keys = await storage.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should return empty array when no items stored', async () => {
      const keys = await storage.keys();
      expect(keys).toHaveLength(0);
    });
  });
});
