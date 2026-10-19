import { describe, expect, it } from 'vitest';

import { parseColor, shadeColor } from './shadeColor';

describe('parseColor', () => {
  it.each([
    ['#ff8000', { r: 255, g: 128, b: 0 }],
    ['#FF8000', { r: 255, g: 128, b: 0 }],
    ['#f80', { r: 255, g: 136, b: 0 }],
    ['#f80c', { r: 255, g: 136, b: 0 }],
    ['#ff800080', { r: 255, g: 128, b: 0 }],
    ['rgb(255, 128, 0)', { r: 255, g: 128, b: 0 }],
    ['rgba(255, 128, 0, 0.5)', { r: 255, g: 128, b: 0 }],
    ['rgb(100%, 50%, 0%)', { r: 255, g: 127.5, b: 0 }],
    ['rgb(255 128 0 / 50%)', { r: 255, g: 128, b: 0 }],
    ['hsl(0, 100%, 50%)', { r: 255, g: 0, b: 0 }],
    ['hsl(120, 100%, 25%)', { r: 0, g: 127.5, b: 0 }],
    ['hsla(240, 100%, 50%, 0.3)', { r: 0, g: 0, b: 255 }],
    ['hsl(240deg 100% 50%)', { r: 0, g: 0, b: 255 }],
    ['hsl(0, 0%, 100%)', { r: 255, g: 255, b: 255 }],
    ['  #000000  ', { r: 0, g: 0, b: 0 }],
  ])('parses %s', (input, expected) => {
    expect(parseColor(input)).toEqual(expected);
  });

  it.each(['', 'red', 'transparent', '#12', 'rgb(1, 2)', 'hsl(a, b, c)'])(
    'returns null for unsupported color %j',
    input => {
      expect(parseColor(input)).toBeNull();
    },
  );
});

describe('shadeColor', () => {
  it('returns the original color at 0%', () => {
    expect(shadeColor('#336699', 0)).toBe('rgb(51, 102, 153)');
  });

  it('returns white at 100%', () => {
    expect(shadeColor('#336699', 1)).toBe('rgb(255, 255, 255)');
  });

  it('lightens towards white', () => {
    expect(shadeColor('#000000', 0.5)).toBe('rgb(128, 128, 128)');
  });

  it('shades hsl colors the same as their hex equivalent', () => {
    expect(shadeColor('hsl(210, 50%, 40%)', 0.3)).toBe(
      shadeColor('#336699', 0.3),
    );
  });

  it('does not turn unsupported colors black', () => {
    expect(shadeColor('rebeccapurple', 0.3)).toBe('rebeccapurple');
  });
});
