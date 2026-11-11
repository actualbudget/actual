import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as asyncStorage from '#platform/server/asyncStorage';
import * as encryption from '#server/encryption';

import { app } from './app';

describe('auth app', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
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
