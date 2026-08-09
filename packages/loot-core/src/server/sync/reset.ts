import { captureException } from '#platform/exceptions';
// @ts-strict-ignore
import * as asyncStorage from '#platform/server/asyncStorage';
import * as connection from '#platform/server/connection';
import * as cloudStorage from '#server/cloud-storage';
import * as db from '#server/db';
import { runMutator } from '#server/mutators';
import * as prefs from '#server/prefs';

import { notifyDroppedMessages } from './notifications';
import { deleteStalePendingMessages } from './replay';

export async function resetSync(
  keyState?,
): Promise<{ error?: { reason: string; meta?: unknown } }> {
  if (!keyState) {
    // If we aren't resetting the key, make sure our key is up-to-date
    // so we don't accidentally upload a file encrypted with the wrong
    // key (or not encrypted at all)
    const { valid, error } = await cloudStorage.checkKey();
    if (error) {
      return { error };
    } else if (!valid) {
      return { error: { reason: 'file-has-new-key' } };
    }
  }

  const { error } = await cloudStorage.resetSyncState(keyState);
  if (error) {
    return { error };
  }

  // Deferred messages hold changes from a newer app version that this
  // client acknowledged into its merkle but couldn't apply yet.
  // Uploading this file as the new source of truth discards them for
  // every device — reset is a destructive last-resort tool, so proceed,
  // but tell the user afterwards (see `notifyDroppedMessages`).
  // TODO: a pre-reset confirmation dialog would be better UX; add one
  // in the client if this notification proves too subtle
  let discardedDeferredCount = 0;

  await runMutator(async () => {
    // Deferred messages belong to the discarded message log; replaying
    // them later would resurrect rows hard-deleted below as empty
    // stubs. Deleted inside the mutator so messages deferred by an
    // in-flight sync during the cloud round-trips above are included.
    // Stale rows (superseded by newer writes, or legacy datasets) go
    // first, uncounted — only real user-visible losses feed the
    // warning notification below.
    deleteStalePendingMessages();
    discardedDeferredCount = Number(
      db.runQuery('DELETE FROM messages_pending').changes,
    );

    // TOOD: We could automatically generate the list of tables to
    // cleanup by looking at the schema
    //
    // Be VERY careful here since we are bulk deleting data. It should
    // never delete any data that doesn't have `tombstone = 1`
    db.execQuery(`
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

  if (discardedDeferredCount > 0) {
    notifyDroppedMessages();
  }

  await prefs.savePrefs({
    groupId: null,
    lastSyncedTimestamp: null,
    lastUploaded: null,
  });

  if (keyState) {
    const { key } = keyState;
    const { cloudFileId } = prefs.getPrefs();

    // The key has changed, we need to update our local data to
    // store the new key

    // Persist key in async storage
    const keys = JSON.parse(
      (await asyncStorage.getItem(`encrypt-keys`)) || '{}',
    );
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
