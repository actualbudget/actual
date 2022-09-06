import { captureException } from '../../platform/exceptions';
import asyncStorage from '../../platform/server/asyncStorage';
import * as cloudStorage from '../cloud-storage';
import * as db from '../db';
import { runMutator } from '../mutators';
import * as prefs from '../prefs';

const connection = require('../../platform/server/connection');

export default async function resetSync(keyState) {
  if (!keyState) {
    // If we aren't resetting the key, make sure our key is up-to-date
    // so we don't accidentally upload a file encrypted with the wrong
    // key (or not encrypted at all)
    let { valid, error } = await cloudStorage.checkKey();
    if (error) {
      return { error };
    } else if (!valid) {
      return { error: { reason: 'file-has-new-key' } };
    }
  }

  let { error } = await cloudStorage.resetSyncState(keyState);
  if (error) {
    return { error };
  }

  await runMutator(async () => {
    // TOOD: We could automatically generate the list of tables to
    // cleanup by looking at the schema
    //
    // Be VERY careful here since we are bulk deleting data. It should
    // never delete any data that doesn't have `tombstone = 1`
    await db.execQuery(`
      DELETE FROM messages_crdt;
      DELETE FROM messages_clock;
      DELETE FROM transactions WHERE tombstone = 1;
      DELETE FROM accounts WHERE tombstone = 1;
      DELETE FROM payees WHERE tombstone = 1;
      DELETE FROM categories WHERE tombstone = 1;
      DELETE FROM category_groups WHERE tombstone = 1;
      DELETE FROM schedules WHERE tombstone = 1;
      DELETE FROM rules WHERE tombstone = 1;
      ANALYZE;
      VACUUM;
    `);
    await db.loadClock();
  });

  await prefs.savePrefs({
    groupId: null,
    lastSyncedTimestamp: null,
    lastUploaded: null
  });

  if (keyState) {
    let { key } = keyState;
    let { cloudFileId } = prefs.getPrefs();

    // The key has changed, we need to update our local data to
    // store the new key

    // Persist key in async storage
    let keys = JSON.parse((await asyncStorage.getItem(`encrypt-keys`)) || '{}');
    keys[cloudFileId] = key.serialize();
    await asyncStorage.setItem('encrypt-keys', JSON.stringify(keys));

    // Save the key id in prefs
    await prefs.savePrefs({ encryptKeyId: key.getId() });
  }

  // Finally, upload the file to make it the "true" version that all
  // other clients need to pull down to get back in sync
  try {
    await cloudStorage.upload();
  } catch (e) {
    if (e.reason) {
      return { error: e };
    }
    captureException(e);
    return { error: { reason: 'upload-failure' } };
  } finally {
    connection.send('prefs-updated');
  }

  return {};
}
