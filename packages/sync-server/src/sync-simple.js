import { existsSync } from 'node:fs';

import {
  create,
  merkle,
  MessageEnvelopeSchema,
  Timestamp,
} from '@actual-app/crdt';

import { openDatabase } from './db';
import messagesSql from './sql/messages.sql?raw';
import { getPathForGroupFile } from './util/paths';

function getGroupDb(groupId) {
  const path = getPathForGroupFile(groupId);
  const needsInit = !existsSync(path);

  const db = openDatabase(path);

  if (needsInit) {
    db.exec(messagesSql);
  }

  return db;
}

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

export function sync(messages, since, groupId) {
  const db = getGroupDb(groupId);
  const newMessages = db.all(
    `SELECT * FROM messages_binary
         WHERE timestamp > ?
         ORDER BY timestamp`,
    [since],
  );

  const trie = addMessages(db, messages);

  db.close();

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
}
