import { serializeClock, getClock, Timestamp, merkle } from '../crdt';
import * as db from '../db';

export function rebuildMerkleHash() {
  let rows = db.runQuery('SELECT timestamp FROM messages_crdt', [], true);
  let trie = {};

  for (let i = 0; i < rows.length; i++) {
    trie = merkle.insert(trie, Timestamp.parse(rows[i].timestamp));
  }

  return {
    numMessages: rows.length,
    trie: trie
  };
}

export default async function repairSync() {
  let rebuilt = rebuildMerkleHash();
  let clock = getClock();

  // Save it locally
  clock.merkle = rebuilt.trie;

  // Persist it in the db
  db.runQuery(
    db.cache('INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)'),
    [serializeClock(clock)]
  );
}
