import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as asyncStorage from '#platform/server/asyncStorage';
import * as encryption from '#server/encryption';

import { app } from './app';

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: new Map<string, unknown>(),
}));

// Global test setup auto-mocks asyncStorage as no-op vi.fn() stubs because
// `#platform/server/asyncStorage` resolves to `index.electron.ts` rather than
// `__mocks__/index.ts`. Back it with an isolated in-memory store here.
vi.mock('#platform/server/asyncStorage', () => ({
  getItem: vi.fn(async (key: string) => mockStorage.get(key)),
  setItem: vi.fn(async (key: string, value: unknown) => {
    mockStorage.set(key, value);
  }),
  removeItem: vi.fn(async (key: string) => {
    mockStorage.delete(key);
  }),
  multiSet: vi.fn(async (keyValues: Array<[string, unknown]>) => {
    for (const [key, value] of keyValues) {
      mockStorage.set(key, value);
    }
  }),
  multiRemove: vi.fn(async (keys: string[]) => {
    for (const key of keys) {
      mockStorage.delete(key);
    }
  }),
}));

describe('auth app', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockStorage.clear();
    await asyncStorage.multiRemove([
      'user-token',
      'encrypt-keys',
      'lastBudget',
      'readOnly',
    ]);
    encryption.unloadAllKeys();
  });

  afterEach(() => {
    encryption.unloadAllKeys();
  });

  describe('subscribe-sign-out', () => {
    it('preserves saved encryption keys by default', async () => {
      const key = await encryption.createKey({
        id: 'key-1',
        password: 'secret',
        salt: 'salt-1',
      });
      await encryption.loadKey(key);
      await asyncStorage.multiSet([
        ['user-token', 'token-123'],
        ['encrypt-keys', JSON.stringify({ 'cloud-1': key.serialize() })],
        ['lastBudget', 'budget-1'],
        ['readOnly', 'false'],
      ]);

      const result = await app.handlers['subscribe-sign-out']();

      expect(result).toBe('ok');
      expect(await asyncStorage.getItem('user-token')).toBeUndefined();
      expect(await asyncStorage.getItem('lastBudget')).toBeUndefined();
      expect(await asyncStorage.getItem('readOnly')).toBeUndefined();
      expect(await asyncStorage.getItem('encrypt-keys')).toBeDefined();
      expect(encryption.hasKey('key-1')).toBe(true);
    });

    it('unloads and removes encryption keys when clearEncryptionKeys is true', async () => {
      const key = await encryption.createKey({
        id: 'key-2',
        password: 'secret',
        salt: 'salt-2',
      });
      await encryption.loadKey(key);
      await asyncStorage.multiSet([
        ['user-token', 'token-456'],
        ['encrypt-keys', JSON.stringify({ 'cloud-2': key.serialize() })],
        ['lastBudget', 'budget-2'],
        ['readOnly', 'true'],
      ]);

      const result = await app.handlers['subscribe-sign-out']({
        clearEncryptionKeys: true,
      });

      expect(result).toBe('ok');
      expect(await asyncStorage.getItem('user-token')).toBeUndefined();
      expect(await asyncStorage.getItem('encrypt-keys')).toBeUndefined();
      expect(await asyncStorage.getItem('lastBudget')).toBeUndefined();
      expect(await asyncStorage.getItem('readOnly')).toBeUndefined();
      expect(encryption.hasKey('key-2')).toBe(false);
    });
  });
});
