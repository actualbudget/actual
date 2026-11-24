import { colors } from './colors';
import { contrastMinimums, contrastPairs } from './contrastPairs';
import { palette } from './palette';
import { composite, contrastRatio, resolveToken } from './resolve';
import { themeNames } from './types';
import type { ThemeName, TokenDefinition } from './types';

const knownFailures = new Set<string>([
  'light: pageTextSubdued on pageBackground',
  'light: pageTextSubdued on tableBackground',
  'light: tableTextLight on tableBackground',
  'light: mobileNavItem on mobileNavBackground',
  'light: noticeText on noticeBackground',
  'light: noticeTextLight on tableBackground',
  'light: warningText on warningBackground',
  'light: warningText on tableBackground',
  'light: errorText on errorBackground',
  'light: formInputTextPlaceholder on formInputBackground',
  'dark: pageTextSubdued on tableBackground',
  'dark: tableHeaderText on tableHeaderBackground',
  'dark: menuItemTextHover on menuItemBackgroundHover',
  'dark: noticeText on noticeBackground',
  'dark: noticeTextLight on tableBackground',
  'midnight: pageTextSubdued on pageBackground',
  'midnight: menuAutoCompleteTextHover on menuAutoCompleteBackgroundHover',
  'midnight: buttonNormalTextHover on buttonNormalBackgroundHover',
  'midnight: noticeText on noticeBackground',
  'midnight: noticeTextDark on noticeBackground',
  'midnight: pillText on pillBackground',
]);

function describePair(theme: ThemeName, text: string, background: string) {
  return `${theme}: ${text} on ${background}`;
}

function measure(theme: ThemeName, pair: (typeof contrastPairs)[number]) {
  let background = resolveToken(pair.background, theme, colors, palette);
  if (pair.over != null) {
    background = composite(
      background,
      resolveToken(pair.over, theme, colors, palette),
    );
  }
  return contrastRatio(
    resolveToken(pair.text, theme, colors, palette),
    background,
  );
}

const cases = themeNames.flatMap(theme =>
  contrastPairs.map(pair => ({
    name: describePair(theme, pair.text, pair.background),
    theme,
    pair,
  })),
);

describe('theme contrast', () => {
  it.each(cases)('$name', ({ name, theme, pair }) => {
    const ratio = measure(theme, pair);
    const minimum = contrastMinimums[pair.level];
    const measured = `${name} measures ${ratio.toFixed(2)}:1 and needs ${minimum}:1.`;

    if (knownFailures.has(name)) {
      expect(
        ratio,
        `${measured} It now passes, so remove it from knownFailures in this file.`,
      ).toBeLessThan(minimum);
    } else {
      expect(
        ratio,
        `${measured} Pick colors with more contrast for this pair.`,
      ).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('only lists known failures for declared pairs', () => {
    const names = new Set(cases.map(({ name }) => name));
    expect([...knownFailures].filter(name => !names.has(name))).toEqual([]);
  });

  it('records the ratio of every known failure', () => {
    const ratios = Object.fromEntries(
      cases
        .filter(({ name }) => knownFailures.has(name))
        .map(({ name, theme, pair }) => [
          name,
          measure(theme, pair).toFixed(2),
        ]),
    );

    expect(ratios).toMatchSnapshot();
  });
});

describe('resolveToken', () => {
  const testPalette = { white: '#ffffff', black: '#000000' };
  const testColors: Record<string, TokenDefinition> = {
    surface: { all: 'white' },
    ink: { light: 'black', dark: 'white', midnight: 'white' },
    alias: { all: { ref: 'ink' } },
    label: { all: { contrastOn: 'ink' } },
    washLabel: { all: { contrastOn: 'wash', over: 'surface' } },
    wash: {
      all: { raw: 'color-mix(in srgb, var(--color-ink) 25%, transparent)' },
    },
    blend: {
      all: { raw: 'color-mix(in srgb, var(--palette-white), #000000)' },
    },
    scrim: { all: { raw: 'rgba(0, 0, 0, 0.5)' } },
    loopA: { all: { ref: 'loopB' } },
    loopB: { all: { ref: 'loopA' } },
  };

  it('resolves palette colors per theme', () => {
    expect(resolveToken('ink', 'light', testColors, testPalette)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      alpha: 1,
    });
    expect(resolveToken('ink', 'dark', testColors, testPalette)).toEqual({
      r: 1,
      g: 1,
      b: 1,
      alpha: 1,
    });
  });

  it('follows references', () => {
    expect(resolveToken('alias', 'dark', testColors, testPalette)).toEqual(
      resolveToken('ink', 'dark', testColors, testPalette),
    );
  });

  it('picks black or white text for a fill', () => {
    expect(resolveToken('label', 'light', testColors, testPalette)).toEqual(
      resolveToken('surface', 'light', testColors, testPalette),
    );
    expect(resolveToken('label', 'dark', testColors, testPalette)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      alpha: 1,
    });
  });

  it('lays a see-through fill over its backdrop before picking text', () => {
    expect(resolveToken('washLabel', 'light', testColors, testPalette)).toEqual(
      { r: 0, g: 0, b: 0, alpha: 1 },
    );
  });

  it('resolves a mix with transparent to the color at that alpha', () => {
    expect(resolveToken('wash', 'dark', testColors, testPalette)).toEqual({
      r: 1,
      g: 1,
      b: 1,
      alpha: 0.25,
    });
  });

  it('mixes two colors evenly when no percentage is given', () => {
    expect(resolveToken('blend', 'light', testColors, testPalette)).toEqual({
      r: 0.5,
      g: 0.5,
      b: 0.5,
      alpha: 1,
    });
  });

  it('rejects a circular reference', () => {
    expect(() =>
      resolveToken('loopA', 'light', testColors, testPalette),
    ).toThrow('circular reference: loopA -> loopB -> loopA');
  });

  it('rejects an unknown token', () => {
    expect(() =>
      resolveToken('missing', 'light', testColors, testPalette),
    ).toThrow('unknown token "missing"');
  });
});

describe('contrastRatio', () => {
  const white = { r: 1, g: 1, b: 1, alpha: 1 };
  const black = { r: 0, g: 0, b: 0, alpha: 1 };

  it('measures black on white as 21', () => {
    expect(contrastRatio(black, white)).toBeCloseTo(21);
  });

  it('blends translucent text into the background first', () => {
    expect(contrastRatio({ ...black, alpha: 0.5 }, white)).toBeCloseTo(
      contrastRatio({ r: 0.5, g: 0.5, b: 0.5, alpha: 1 }, white),
    );
  });

  it('rejects a translucent background', () => {
    expect(() => contrastRatio(black, { ...white, alpha: 0.5 })).toThrow(
      'the background must be opaque',
    );
  });
});
