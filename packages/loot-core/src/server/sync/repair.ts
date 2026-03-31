// @ts-strict-ignore
import { getClock, merkle, serializeClock, Timestamp } from '@actual-app/crdt';

import * as db from '../db';

export function rebuildMerkleHash(): {
  numMessages: number;
  trie: merkle.TrieNode;
} {
  const rows: { timestamp: string }[] = db.runQuery(
    'SELECT timestamp FROM messages_crdt',
    [],
    true,
  );
  let trie = merkle.emptyTrie();

  for (let i = 0; i < rows.length; i++) {
    trie = merkle.insert(trie, Timestamp.parse(rows[i].timestamp));
  }

  return {
    numMessages: rows.length,
    trie,
  };
}

export async function repairSync(): Promise<void> {
  const rebuilt = rebuildMerkleHash();
  const clock = getClock();

  // Save it locally
  clock.merkle = rebuilt.trie;

  // Persist it in the db
  db.runQuery(
    db.cache('INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)'),
    [serializeClock(clock)],
  );
}
