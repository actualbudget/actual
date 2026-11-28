import { formatHex, formatHex8 } from 'culori';

import { colors } from './colors';
import { palette } from './palette';
import { resolveToken } from './resolve';
import { themeNames } from './types';

describe('resolved theme colors', () => {
  it.each(themeNames)('%s resolves every token', theme => {
    const resolved = Object.fromEntries(
      Object.keys(colors).map(name => {
        const color = resolveToken(name, theme, colors, palette);
        const value = { mode: 'rgb' as const, ...color };
        return [name, color.alpha < 1 ? formatHex8(value) : formatHex(value)];
      }),
    );

    expect(resolved).toMatchSnapshot();
  });
});

describe('resolveToken overrides', () => {
  const red = { r: 1, g: 0, b: 0, alpha: 1 };

  it('uses an override for the token itself', () => {
    expect(
      resolveToken('pageText', 'light', colors, palette, name =>
        name === 'pageText' ? red : undefined,
      ),
    ).toEqual(red);
  });

  it('uses an override anywhere along the reference chain', () => {
    expect(
      resolveToken('tableBackground', 'light', colors, palette, name =>
        name === 'background' ? red : undefined,
      ),
    ).toEqual(red);
  });

  it('falls through to the built-in value when the override declines', () => {
    expect(
      resolveToken('tableBackground', 'light', colors, palette, () => null),
    ).toEqual(resolveToken('tableBackground', 'light', colors, palette));
  });
});
