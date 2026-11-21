import { colors } from './colors';
import { palette } from './palette';
import { contrastRatio, resolveToken } from './resolve';
import { themeNames } from './types';

type TokenName = keyof typeof colors;

const minimumDifference = 1.03;

const statePairs: Array<[TokenName, TokenName]> = [
  ['tableRowBackgroundHover', 'tableBackground'],
  ['tableRowBackgroundHighlight', 'tableBackground'],
  ['menuItemBackgroundHover', 'menuBackground'],
  ['menuAutoCompleteBackgroundHover', 'menuAutoCompleteBackground'],
  ['buttonNormalBackgroundHover', 'buttonNormalBackground'],
  ['buttonPrimaryBackgroundHover', 'buttonPrimaryBackground'],
  ['sidebarItemBackgroundHover', 'sidebarBackground'],
  ['accentHover', 'accent'],
  ['accentSubtle', 'background'],
];

const knownSame = new Set<string>([
  'light: buttonNormalBackgroundHover on buttonNormalBackground',
]);

const cases = themeNames.flatMap(theme =>
  statePairs.map(([state, resting]) => ({
    name: `${theme}: ${state} on ${resting}`,
    theme,
    state,
    resting,
  })),
);

describe('theme states', () => {
  it.each(cases)(
    '$name can be told apart',
    ({ name, theme, state, resting }) => {
      const difference = contrastRatio(
        resolveToken(state, theme, colors, palette),
        resolveToken(resting, theme, colors, palette),
      );
      const measured = `${name} differ by ${difference.toFixed(2)}:1 and need ${minimumDifference}:1.`;

      if (knownSame.has(name)) {
        expect(
          difference,
          `${measured} It can now be told apart, so remove it from knownSame.`,
        ).toBeLessThan(minimumDifference);
      } else {
        expect(
          difference,
          `${measured} A hovered or selected surface must not match the surface it sits on.`,
        ).toBeGreaterThanOrEqual(minimumDifference);
      }
    },
  );
});
