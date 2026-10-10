import { merkle, Timestamp } from '@actual-app/crdt';

import messagesSql from './sql/messages.sql?raw';

// Storage-agnostic sync logic. `db` is anything implementing the
// WrappedDatabase interface (better-sqlite3 file, Durable Object SQLite, ...)
// that holds a single sync group's messages.

export { messagesSql };

/**
 * @typedef {{ timestamp: string, isEncrypted: boolean, content: Uint8Array }} SyncMessage
 */

function addMessages(db, messages) {
  let returnValue;
  db.transaction(() => {
    let trie = getMerkle(db);

    if (messages.length > 0) {
      for (const msg of messages) {
        const info = db.mutate(
          `INSERT OR IGNORE INTO messages_binary (timestamp, is_encrypted, content)
             VALUES (?, ?, ?)`,
          [msg.timestamp, msg.isEncrypted ? 1 : 0, Buffer.from(msg.content)],
        );

        if (info.changes > 0) {
          trie = merkle.insert(trie, Timestamp.parse(msg.timestamp));
        }
      }
    }

    trie = merkle.prune(trie);

    db.mutate(
      'INSERT INTO messages_merkles (id, merkle) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET merkle = ?',
      [JSON.stringify(trie), JSON.stringify(trie)],
    );

    returnValue = trie;
  });

  return returnValue;
}

function getMerkle(db) {
  const rows = db.all('SELECT * FROM messages_merkles');

  if (rows.length > 0) {
    return JSON.parse(rows[0].merkle);
  } else {
    // No merkle trie exists yet (first sync of the app), so create a
    // default one.
    return {};
  }
}

/**
 * Stores `messages` in the group db and returns the updated merkle trie plus
 * every message newer than `since`. Inputs and outputs are plain objects so
 * they can cross a Durable Object RPC boundary.
 *
 * @param {SyncMessage[]} messages
 * @param {string} since
 * @returns {{ trie: object, newMessages: SyncMessage[] }}
 */
export function syncGroup(db, messages, since) {
  const newMessages = db.all(
    `SELECT * FROM messages_binary
         WHERE timestamp > ?
         ORDER BY timestamp`,
    [since],
  );

  const trie = addMessages(db, messages);

  return {
    trie,
    newMessages: newMessages.map(msg => ({
      timestamp: msg.timestamp,
      isEncrypted: msg.is_encrypted === 1,
      content: msg.content,
    })),
  };
}
