import { colors } from './colors';
import { contrastMinimums, contrastPairs } from './contrastPairs';
import { palette } from './palette';
import { composite, contrastRatio, resolveToken } from './resolve';
import { themeNames } from './types';
import type { ThemeName, TokenDefinition } from './types';

const knownFailures: Record<string, number> = {
  'light: pageTextLink on pageBackground': 3.48,
  'light: pageTextLink on tableBackground': 4.13,
  'light: pageTextSubdued on pageBackground': 1.81,
  'light: pageTextSubdued on tableBackground': 2.15,
  'light: tableTextLight on tableBackground': 2.91,
  'light: menuItemTextSelected on menuBackground': 3.53,
  'light: menuItemTextHeader on menuBackground': 2.91,
  'light: menuKeybindingText on menuBackground': 2.91,
  'light: mobileHeaderTextSubdued on mobileHeaderBackground': 2.77,
  'light: mobileNavItem on mobileNavBackground': 2.61,
  'light: buttonPrimaryTextHover on buttonPrimaryBackgroundHover': 3.53,
  'light: buttonNormalSelectedText on buttonNormalSelectedBackground': 4.13,
  'light: noticeText on noticeBackground': 4.29,
  'light: noticeTextLight on tableBackground': 2.9,
  'light: warningText on warningBackground': 2.9,
  'light: warningText on tableBackground': 3.39,
  'light: errorText on errorBackground': 3.74,
  'light: formLabelText on tableBackground': 4.13,
  'light: formInputTextPlaceholder on formInputBackground': 2.05,
  'dark: pageTextLink on pageBackground': 4.14,
  'dark: pageTextLink on tableBackground': 2.39,
  'dark: pageTextSubdued on tableBackground': 2.69,
  'dark: tableHeaderText on tableHeaderBackground': 4.01,
  'dark: menuItemTextHover on menuItemBackgroundHover': 4.08,
  'dark: menuItemTextSelected on menuBackground': 2.39,
  'dark: mobileNavItemSelected on mobileNavBackground': 2.39,
  'dark: noticeText on noticeBackground': 3.61,
  'dark: noticeTextLight on tableBackground': 3.97,
  'midnight: pageTextLink on pageBackground': 3.15,
  'midnight: pageTextSubdued on pageBackground': 2.65,
  'midnight: menuItemTextSelected on menuBackground': 3.08,
  'midnight: menuAutoCompleteTextHover on menuAutoCompleteBackgroundHover': 3.09,
  'midnight: buttonPrimaryText on buttonPrimaryBackground': 3.53,
  'midnight: buttonPrimaryTextHover on buttonPrimaryBackgroundHover': 3.53,
  'midnight: buttonNormalTextHover on buttonNormalBackgroundHover': 2.98,
  'midnight: noticeText on noticeBackground': 2.13,
  'midnight: noticeTextDark on noticeBackground': 3.22,
  'midnight: pillText on pillBackground': 4.19,
};

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

    if (name in knownFailures) {
      expect(ratio).toBeLessThan(minimum);
      expect(Number(ratio.toFixed(2))).toBe(knownFailures[name]);
    } else {
      expect(ratio).toBeGreaterThanOrEqual(minimum);
    }
  });

  it('only lists known failures for declared pairs', () => {
    const names = new Set(cases.map(({ name }) => name));
    expect(Object.keys(knownFailures).filter(name => !names.has(name))).toEqual(
      [],
    );
  });
});

describe('resolveToken', () => {
  const testPalette = { white: '#ffffff', black: '#000000' };
  const testColors: Record<string, TokenDefinition> = {
    surface: { all: 'white' },
    ink: { light: 'black', dark: 'white', midnight: 'white' },
    alias: { all: { ref: 'ink' } },
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
