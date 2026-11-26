import { existsSync } from 'node:fs';

import {
  create,
  merkle,
  MessageEnvelopeSchema,
  Timestamp,
} from '@actual-app/crdt';
import type { MessageEnvelope } from '@actual-app/crdt';

import { openDatabase } from './db';
import type { WrappedDatabase } from './db';
import messagesSql from './sql/messages.sql?raw';
import { getPathForGroupFile } from './util/paths';
import type { GroupId } from './util/paths';

// Matches the client's Timestamp maxDrift; later messages break sync on other devices
const MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000;

type RejectedReason = 'invalid-timestamp' | 'clock-drift';

// Thrown inside the transaction so a rejected message rolls everything back
class RejectedMessageError extends Error {
  reason: RejectedReason;

  constructor(reason: RejectedReason) {
    super(reason);
    this.reason = reason;
  }
}

type StoredMessage = {
  timestamp: string;
  is_encrypted: number;
  content: Buffer;
};

type SyncResult =
  | {
      trie: merkle.TrieNode;
      newMessages: MessageEnvelope[];
      error?: undefined;
    }
  | { error: RejectedReason; trie?: undefined; newMessages?: undefined };

function getGroupDb(groupId: GroupId) {
  const path = getPathForGroupFile(groupId);
  const needsInit = !existsSync(path);

  const db = openDatabase(path);

  if (needsInit) {
    db.exec(messagesSql);
  }

  return db;
}

function addMessages(db: WrappedDatabase, messages: MessageEnvelope[]) {
  return db.transaction(() => {
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
          if (!timestamp) {
            throw new RejectedMessageError('invalid-timestamp');
          }
          if (timestamp.millis() - Date.now() > MAX_FUTURE_DRIFT_MS) {
            throw new RejectedMessageError('clock-drift');
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

    return trie;
  });
}

function getMerkle(db: WrappedDatabase): merkle.TrieNode {
  const rows = db.all<{ merkle: string }>('SELECT * FROM messages_merkles');

  if (rows.length > 0) {
    return JSON.parse(rows[0].merkle);
  } else {
    // No merkle trie exists yet (first sync of the app), so create a
    // default one.
    return {};
  }
}

export function sync(
  messages: MessageEnvelope[],
  since: string,
  groupId: GroupId,
): SyncResult {
  const db = getGroupDb(groupId);
  try {
    const newMessages = db.all<StoredMessage>(
      `SELECT * FROM messages_binary
           WHERE timestamp > ?
           ORDER BY timestamp`,
      [since],
    );

    const trie = addMessages(db, messages);

    return {
      trie,
      newMessages: newMessages.map(msg =>
        create(MessageEnvelopeSchema, {
          timestamp: msg.timestamp,
          isEncrypted: msg.is_encrypted === 1,
          content: msg.content,
        }),
      ),
    };
  } catch (e) {
    if (e instanceof RejectedMessageError) {
      return { error: e.reason };
    }
    throw e;
  } finally {
    db.close();
  }
}
