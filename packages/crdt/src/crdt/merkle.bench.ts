import { bench, describe } from 'vitest';

import * as merkle from './merkle';
import { Timestamp } from './timestamp';

const NODE = '0123456789abcdef';
const MINUTE = 1000 * 60;
const BASE = Date.UTC(2020, 0, 1);

function makeTimestamps(count: number, startMillis = BASE): Timestamp[] {
  const timestamps: Timestamp[] = [];
  for (let i = 0; i < count; i++) {
    // Spread messages across time so the trie gains realistic depth.
    timestamps.push(new Timestamp(startMillis + i * MINUTE, i % 100, NODE));
  }
  return timestamps;
}

const small = makeTimestamps(100);
const large = makeTimestamps(5000);
const largeTrie = merkle.build(large);

// A second trie that diverges from `largeTrie` near the end, simulating two
// clients that have synced most of their history but differ on recent edits.
const diverged = merkle.build([
  ...large.slice(0, large.length - 10),
  ...makeTimestamps(10, BASE + large.length * MINUTE * 2),
]);

describe('merkle trie', () => {
  bench('build trie from 100 messages', () => {
    merkle.build(small);
  });

  bench('build trie from 5000 messages', () => {
    merkle.build(large);
  });

  bench('diff two large tries', () => {
    merkle.diff(largeTrie, diverged);
  });

  bench('prune large trie', () => {
    merkle.prune(largeTrie);
  });
});
