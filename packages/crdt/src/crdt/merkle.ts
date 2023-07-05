// TODO: Ok, several problems:
//
// * If nothing matches between two merkle trees, we should fallback
// * to the last window instead the front one (use 0 instead of the
// * key)
//
// * Need to check to make sure if account exists when handling
// * transaction changes in syncing

import { Timestamp } from './timestamp';

/**
 * Represents a node within a trinary radix trie.
 */
export type TrieNode = {
  '0'?: TrieNode;
  '1'?: TrieNode;
  '2'?: TrieNode;
  hash?: number;
};

export function emptyTrie(): TrieNode {
  return { hash: 0 };
}

export function getKeys(trie: TrieNode): ('0' | '1' | '2')[] {
  return Object.keys(trie).filter(x => x !== 'hash') as ('0' | '1' | '2')[];
}

export function keyToTimestamp(key: string): number {
  // 16 is the length of the base 3 value of the current time in
  // minutes. Ensure it's padded to create the full value
  let fullkey = key + '0'.repeat(16 - key.length);

  // Parse the base 3 representation
  return parseInt(fullkey, 3) * 1000 * 60;
}

/**
 * Mutates `trie` to insert a node at `timestamp`
 */
export function insert(trie: TrieNode, timestamp: Timestamp) {
  let hash = timestamp.hash();
  let key = Number(Math.floor(timestamp.millis() / 1000 / 60)).toString(3);

  trie = Object.assign({}, trie, { hash: trie.hash ^ hash });
  return insertKey(trie, key, hash);
}

function insertKey(trie: TrieNode, key: string, hash: number) {
  if (key.length === 0) {
    return trie;
  }
  const c = key[0];
  const n = trie[c] || {};
  return Object.assign({}, trie, {
    [c]: Object.assign({}, n, insertKey(n, key.slice(1), hash), {
      hash: n.hash ^ hash,
    }),
  });
}

export function build(timestamps: Timestamp[]) {
  let trie = emptyTrie();
  for (let timestamp of timestamps) {
    insert(trie, timestamp);
  }
  return trie;
}

export function diff(trie1: TrieNode, trie2: TrieNode): number {
  if (trie1.hash === trie2.hash) {
    return null;
  }

  let node1 = trie1;
  let node2 = trie2;
  let k = '';

  // This loop will eventually stop when it traverses down to find
  // where the hashes differ, or otherwise when there are no leaves
  // left (this shouldn't happen, if that's the case the hash check at
  // the top of this function should pass)
  while (1) {
    let keyset = new Set([...getKeys(node1), ...getKeys(node2)]);
    let keys = [...keyset.values()];
    keys.sort();

    let diffkey = null;

    // Traverse down the trie through keys that aren't the same. We
    // traverse down the keys in order. Stop in two cases: either one
    // of the nodes doesn't have the key, or a different key isn't
    // found. For the former case, we have to that because pruning is
    // lossy. We don't know if we've pruned off a changed key so we
    // can't traverse down anymore. For the latter case, it means two
    // things: either we've hit the bottom of the tree, or the changed
    // key has been pruned off. In the latter case we have a "partial"
    // key and will fill the rest with 0s. Note that if multiple older
    // messages were added into one trie, it's possible we will
    // generate a time that only encompasses *some* of the those
    // messages. Pruning is lossy, and we traverse down the left-most
    // changed time that we know of, because of pruning it might take
    // multiple passes to sync up a trie.
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];

      if (!node1[key] || !node2[key]) {
        break;
      }

      let next1 = node1[key];
      let next2 = node2[key];
      if (next1.hash !== next2.hash) {
        diffkey = key;
        break;
      }
    }

    if (!diffkey) {
      return keyToTimestamp(k);
    }

    k += diffkey;
    node1 = node1[diffkey] || emptyTrie();
    node2 = node2[diffkey] || emptyTrie();
  }
}

export function prune(trie: TrieNode, n = 2): TrieNode {
  // Do nothing if empty
  if (!trie.hash) {
    return trie;
  }

  let keys = getKeys(trie);
  keys.sort();

  let next = { hash: trie.hash };

  // Prune child nodes.
  for (let k of keys.slice(-n)) {
    next[k] = prune(trie[k], n);
  }

  return next;
}

export function debug(trie: TrieNode, k = '', indent = 0) {
  const str =
    ' '.repeat(indent) +
    (k !== '' ? `k: ${k} ` : '') +
    `hash: ${trie.hash || '(empty)'}\n`;
  return (
    str +
    getKeys(trie)
      .map(key => {
        return debug(trie[key], key, indent + 2);
      })
      .join('')
  );
}
