import assert from 'node:assert/strict';

import { test } from 'vitest';

import { bufferToUint8Array } from '../buffer-utils';

test('copies only the viewed bytes, not the whole underlying slab', () => {
  // Simulate a Buffer that is a slice of a larger pool slab: the view is 16
  // bytes starting at offset 10 of a 64-byte slab.
  const slab = Buffer.alloc(64);
  const view = slab.subarray(10, 26);
  const zipStart = Buffer.from([
    80, 75, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  ]);
  view.set(zipStart);

  const result = bufferToUint8Array(view);

  assert.equal(
    result.length,
    view.length,
    'expected the view length, not the slab length',
  );
  assert.deepEqual(Array.from(result), Array.from(view));
});
