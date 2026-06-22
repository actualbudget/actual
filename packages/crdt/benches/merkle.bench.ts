import { bench, describe } from 'vitest';

import * as merkle from '../src/crdt/merkle';
import { Timestamp } from '../src/crdt/timestamp';

const NODE = '0123456789ABCDEF';
const START_MILLIS = Date.parse('2020-01-01T00:00:00.000Z');

// Generates a realistic set of CRDT timestamps spread roughly one minute apart,
// mimicking a sync log accumulated over time across many messages.
function makeTimestamps(count: number, offsetMinutes = 0): Timestamp[] {
  const timestamps: Timestamp[] = [];
  for (let i = 0; i < count; i++) {
    const millis = START_MILLIS + (i + offsetMinutes) * 60_000;
    timestamps.push(new Timestamp(millis, i % 0xffff, NODE));
  }
  return timestamps;
}

const SMALL = makeTimestamps(100);
const LARGE = makeTimestamps(5000);

// Two tries that share most of their history but diverge near the end. This is
// the common case the sync protocol hits when reconciling two clients.
const baseTimestamps = makeTimestamps(5000);
const divergentTimestamps = makeTimestamps(5000, 4900);
const trieA = merkle.build(baseTimestamps);
const trieB = merkle.build(divergentTimestamps);
const largeTrie = merkle.build(LARGE);

describe('merkle trie', () => {
  bench('build from 100 timestamps', () => {
    merkle.build(SMALL);
  });

  bench('build from 5000 timestamps', () => {
    merkle.build(LARGE);
  });

  bench('insert 100 timestamps into an empty trie', () => {
    let trie = merkle.emptyTrie();
    for (const timestamp of SMALL) {
      trie = merkle.insert(trie, timestamp);
    }
  });

  bench('diff two divergent tries (5000 entries each)', () => {
    merkle.diff(trieA, trieB);
  });

  bench('prune a large trie', () => {
    merkle.prune(largeTrie);
  });
});
