import { describe, expect, it } from 'vitest';

import {
  deserializeValue,
  deserializeValueSafe,
  isUnknownFormatValue,
  serializeValue,
} from './serialization';

describe('sync value serialization', () => {
  it('round-trips known value types', () => {
    for (const value of [null, 0, -12.5, '', 'hello', 'N:tricky']) {
      expect(deserializeValue(serializeValue(value))).toBe(value);
    }
  });

  it('treats unknown and extended prefixes as unknown format', () => {
    // 'N16:' and 'Sx:' guard against first-character prefix collisions
    // with future tags — they must defer, not misdecode
    for (const raw of ['B:true', 'N16:123', 'Sx:hi', 'x', '']) {
      const value = deserializeValueSafe(raw);
      expect(isUnknownFormatValue(value)).toBe(true);
      // The original encoding survives for a future version to decode
      expect(serializeValue(value)).toBe(raw);
    }
  });
});
