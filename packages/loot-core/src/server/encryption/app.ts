import { v4 as uuidv4 } from 'uuid';

import * as asyncStorage from '../../platform/server/asyncStorage';
import { Budget } from '../../types/budget';
import { createApp } from '../app';
import { post } from '../post';
import * as prefs from '../prefs';
import { getServer } from '../server-config';
import { makeTestMessage, resetSync } from '../sync';

import * as encryption from '.';

export type EncryptionHandlers = {
  'key-make': typeof keyMake;
  'key-test': typeof keyTest;
};

export const app = createApp<EncryptionHandlers>();
app.method('key-make', keyMake);
app.method('key-test', keyTest);

// A user can only enable/change their key with the file loaded. This
// will change in the future: during onboarding the user should be
// able to enable encryption. (Imagine if they are importing data from
// another source, they should be able to encrypt first)
async function keyMake({ password }: { password: string }) {
  if (!prefs.getPrefs()) {
    throw new Error('key-make must be called with file loaded');
  }

  const salt = encryption.randomBytes(32).toString('base64');
  const id = uuidv4();
  const key = await encryption.createKey({ id, password, salt });

  // Load the key
  await encryption.loadKey(key);

  // Make some test data to use if the key is valid or not
  const testContent = await makeTestMessage(key.getId());

  // Changing your key necessitates a sync reset as well. This will
  // clear all existing encrypted data from the server so you won't
  // have a mix of data encrypted with different keys.
  return await resetSync({
    key,
    salt,
    testContent: JSON.stringify({
      ...testContent,
      value: testContent.value.toString('base64'),
    }),
  });
}

// This can be called both while a file is already loaded or not. This
// will see if a key is valid and if so save it off.
async function keyTest({
  cloudFileId,
  password,
}: {
  cloudFileId?: Budget['cloudFileId'];
  password: string;
}) {
  const userToken = await asyncStorage.getItem('user-token');

  if (cloudFileId == null) {
    cloudFileId = prefs.getPrefs().cloudFileId;
  }

  let validCloudFileId: NonNullable<Budget['cloudFileId']>;
  let res: {
    id: string;
    salt: string;
    test: string | null;
  };
  try {
    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error('No sync server configured.');
    }
    res = await post(serverConfig.SYNC_SERVER + '/user-get-key', {
      token: userToken,
      fileId: cloudFileId,
    });
    validCloudFileId = cloudFileId!;
  } catch (e) {
    console.log(e);
    return { error: { reason: 'network' } };
  }

  const { id, salt, test: originalTest } = res;

  if (!originalTest) {
    return { error: { reason: 'old-key-style' } };
  }

  const test: {
    value: string;
    meta: {
      keyId: string;
      algorithm: string;
      iv: string;
      authTag: string;
    };
  } = JSON.parse(originalTest);

  const key = await encryption.createKey({ id, password, salt });
  encryption.loadKey(key);

  try {
    await encryption.decrypt(Buffer.from(test.value, 'base64'), test.meta);
  } catch (e) {
    console.log(e);

    // Unload the key, it's invalid
    encryption.unloadKey(key);
    return { error: { reason: 'decrypt-failure' } };
  }

  // Persist key in async storage
  const keys = JSON.parse((await asyncStorage.getItem(`encrypt-keys`)) || '{}');
  keys[validCloudFileId] = key.serialize();
  await asyncStorage.setItem('encrypt-keys', JSON.stringify(keys));

  // Save the key id in prefs if the are loaded. If they aren't, we
  // are testing a key to download a file and when the file is
  // actually downloaded it will update the prefs with the latest key id
  if (prefs.getPrefs()) {
    await prefs.savePrefs({ encryptKeyId: key.getId() });
  }

  return {};
}
