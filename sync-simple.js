let { existsSync, readFileSync } = require('fs');
let { join } = require('path');
let { openDatabase } = require('./db');

let actual = require('@actual-app/api');
let merkle = actual.internal.merkle;
let Timestamp = actual.internal.timestamp.Timestamp;

function getGroupDb(groupId) {
  let path = join(__dirname, `user-files/${groupId}.sqlite`);
  let needsInit = !existsSync(path);

  let db = openDatabase(path);

  if (needsInit) {
    let sql = readFileSync(join(__dirname, 'sql/messages.sql'), 'utf8');
    db.exec(sql);
  }

  return db;
}

function addMessages(db, messages) {
  let returnValue;
  db.transaction(() => {
    let trie = getMerkle(db);

    if (messages.length > 0) {
      for (let msg of messages) {
        let info = db.mutate(
          `INSERT OR IGNORE INTO messages_binary (timestamp, is_encrypted, content)
             VALUES (?, ?, ?)`,
          [
            msg.getTimestamp(),
            msg.getIsencrypted() ? 1 : 0,
            Buffer.from(msg.getContent())
          ]
        );

        if (info.changes > 0) {
          trie = merkle.insert(trie, Timestamp.parse(msg.getTimestamp()));
        }
      }
    }

    trie = merkle.prune(trie);

    db.mutate(
      'INSERT INTO messages_merkles (id, merkle) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET merkle = ?',
      [JSON.stringify(trie), JSON.stringify(trie)]
    );

    returnValue = trie;
  });

  return returnValue;
}

function getMerkle(db, group_id) {
  let rows = db.all('SELECT * FROM messages_merkles', [group_id]);

  if (rows.length > 0) {
    return JSON.parse(rows[0].merkle);
  } else {
    // No merkle trie exists yet (first sync of the app), so create a
    // default one.
    return {};
  }
}

function sync(messages, since, fileId) {
  let db = getGroupDb(fileId);
  let newMessages = db.all(
    `SELECT * FROM messages_binary
         WHERE timestamp > ?
         ORDER BY timestamp`,
    [since],
  );

  let trie = addMessages(db, messages);

  return { trie, newMessages };
}

module.exports = { sync };
