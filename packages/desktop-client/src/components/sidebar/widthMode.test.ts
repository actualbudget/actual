import { describe, expect, it } from 'vitest';

import {
  nextWidthMode,
  WIDTH_MODE_ORDER,
  WIDTH_MODE_PIXELS,
} from './widthMode';

describe('nextWidthMode', () => {
  it('cycles rail -> compact -> full -> rail', () => {
    expect(nextWidthMode('rail')).toBe('compact');
    expect(nextWidthMode('compact')).toBe('full');
    expect(nextWidthMode('full')).toBe('rail');
  });

  it('covers every mode in WIDTH_MODE_ORDER exactly once', () => {
    const seen = new Set(WIDTH_MODE_ORDER.map(nextWidthMode));
    expect(seen.size).toBe(WIDTH_MODE_ORDER.length);
  });

  it('has a pixel width for every mode', () => {
    for (const mode of WIDTH_MODE_ORDER) {
      expect(WIDTH_MODE_PIXELS[mode]).toBeGreaterThan(0);
    }
    expect(WIDTH_MODE_PIXELS.rail).toBeLessThan(WIDTH_MODE_PIXELS.compact);
    expect(WIDTH_MODE_PIXELS.compact).toBeLessThan(WIDTH_MODE_PIXELS.full);
  });
});
