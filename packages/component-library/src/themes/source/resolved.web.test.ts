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
