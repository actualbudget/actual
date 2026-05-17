import { describe, expect, it } from 'vitest';

import { shadeColor } from './DonutGraph';

describe('shadeColor', () => {
  it('lightens hex colors', () => {
    expect(shadeColor('#000000', 0.5)).toBe('rgb(128, 128, 128)');
  });

  it('lightens hsl colors without falling back to black', () => {
    expect(shadeColor('hsl(37, 100%, 21%)', 0.15)).toBe('rgb(129, 94, 38)');
  });
});
