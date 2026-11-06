import { merkle, Timestamp } from '@actual-app/crdt';

import type { SyncMessage, SyncResult } from '#storage/types';

import messagesSql from './sql/messages.sql?raw';

// Storage-agnostic sync logic for a database holding one sync group's messages.

export type SyncDatabase = {
  // Database drivers return untyped rows; each query determines their shape.
  all(sql: string, params?: string[]): unknown[];
  mutate(
    sql: string,
    params: (string | number | Uint8Array)[],
  ): { changes: number };
  transaction(fn: () => void): void;
};

type MessageRow = {
  timestamp: string;
  is_encrypted: number;
  content: Uint8Array;
};

export { messagesSql };

// Matches the client's Timestamp maxDrift; later messages break sync on other devices
const MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000;

type SyncRejectedReason = 'invalid-timestamp' | 'clock-drift';

class SyncRejectedError extends Error {
  constructor(readonly rejectedReason: SyncRejectedReason) {
    super(rejectedReason);
  }
}

function addMessages(db: SyncDatabase, messages: SyncMessage[]) {
  let returnValue: merkle.TrieNode = {};
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
          const timestamp = Timestamp.parse(msg.timestamp);
          // Throwing rolls back the transaction
          if (!timestamp) {
            throw new SyncRejectedError('invalid-timestamp');
          }
          if (timestamp.millis() - Date.now() > MAX_FUTURE_DRIFT_MS) {
            throw new SyncRejectedError('clock-drift');
          }
          trie = merkle.insert(trie, timestamp);
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

function getMerkle(db: SyncDatabase): merkle.TrieNode {
  // messagesSql defines messages_merkles.merkle as serialized JSON text.
  const rows = db.all('SELECT * FROM messages_merkles') as { merkle: string }[];

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
 * every message newer than `since`, or an `error` (and no changes) when a
 * message's timestamp is rejected. Inputs and outputs are plain objects;
 * the route handler handles protobuf serialization.
 */
export function syncGroup(
  db: SyncDatabase,
  messages: SyncMessage[],
  since: string,
): SyncResult {
  // The selected columns are defined by the messages_binary schema in messagesSql.
  const newMessages = db.all(
    `SELECT * FROM messages_binary
         WHERE timestamp > ?
         ORDER BY timestamp`,
    [since],
  ) as MessageRow[];

  let trie: merkle.TrieNode;
  try {
    trie = addMessages(db, messages);
  } catch (e) {
    if (e instanceof SyncRejectedError) {
      return { error: e.rejectedReason };
    }
    throw e;
  }

  return {
    trie,
    newMessages: newMessages.map(msg => ({
      timestamp: msg.timestamp,
      isEncrypted: msg.is_encrypted === 1,
      content: msg.content,
    })),
  };
}
