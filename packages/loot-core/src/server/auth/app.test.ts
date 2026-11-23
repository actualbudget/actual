import * as asyncStorage from '#platform/server/asyncStorage';
import * as encryption from '#server/encryption';

import { app } from './app';

vi.unmock('#platform/server/asyncStorage');

describe('subscribe-sign-out', () => {
  const savedKey = {
    id: 'key-1',
    base64: Buffer.alloc(32, 1).toString('base64'),
  };
  const savedKeys = JSON.stringify({ 'cloud-1': savedKey });

  beforeEach(async () => {
    asyncStorage.init({ persist: false });
    encryption.unloadAllKeys();
    await encryption.loadKey(savedKey);
    await asyncStorage.multiSet([
      ['user-token', 'token-123'],
      ['encrypt-keys', savedKeys],
    ]);
  });

  afterEach(() => {
    encryption.unloadAllKeys();
  });

  it('keeps encryption keys by default', async () => {
    await app.handlers['subscribe-sign-out']();

    expect(await asyncStorage.getItem('user-token')).toBeUndefined();
    expect(await asyncStorage.getItem('encrypt-keys')).toBe(savedKeys);
    expect(encryption.hasKey('key-1')).toBe(true);
  });

  it('clears encryption keys when clearEncryptionKeys is true', async () => {
    await app.handlers['subscribe-sign-out']({ clearEncryptionKeys: true });

    expect(await asyncStorage.getItem('user-token')).toBeUndefined();
    expect(await asyncStorage.getItem('encrypt-keys')).toBeUndefined();
    expect(encryption.hasKey('key-1')).toBe(false);
  });
});
