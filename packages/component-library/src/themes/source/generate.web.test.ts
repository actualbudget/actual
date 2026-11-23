import { theme } from '#theme';
import {
  darkThemeCss,
  lightThemeCss,
  midnightThemeCss,
  paletteCss,
} from '#themes';

import { colors } from './colors';
import { generateThemeCss } from './generate';
import { palette } from './palette';

function declarations(css: string, prefix: string) {
  return [...css.matchAll(new RegExp(`--${prefix}-([A-Za-z0-9]+): `, 'g'))].map(
    match => match[1],
  );
}

describe('built-in themes', () => {
  it.each([
    ['light', lightThemeCss],
    ['dark', darkThemeCss],
    ['midnight', midnightThemeCss],
  ])('%s defines every token once', (_, css) => {
    expect(declarations(css, 'color')).toEqual(Object.keys(colors));
  });

  it('defines every palette color', () => {
    expect(declarations(paletteCss, 'palette')).toEqual(Object.keys(palette));
  });

  it('resolves palette colors, references and raw values', () => {
    expect(lightThemeCss).toContain(
      '  --color-pageBackground: var(--palette-navy100);',
    );
    expect(darkThemeCss).toContain(
      '  --color-budgetNumberZero: var(--color-tableTextSubdued);',
    );
    expect(midnightThemeCss).toContain(
      '  --color-overlayBackground: rgba(0, 0, 0, 0.3);',
    );
  });

  it('writes derived accent tokens as plain colors', () => {
    expect(lightThemeCss).toContain(
      '  --color-accent: var(--palette-purple500);',
    );
    expect(lightThemeCss).toContain('  --color-accentHover: #7300c3;');
    expect(darkThemeCss).toContain('  --color-accentContrast: #ffffff;');
    expect(darkThemeCss).toContain('  --color-calendarSelectedText: #ffffff;');
    expect(lightThemeCss).toContain(
      '  --color-buttonPrimaryBackground: var(--color-accent);',
    );
  });
});

describe('theme', () => {
  it('exposes every token as its css variable', () => {
    expect(Object.keys(theme)).toEqual(Object.keys(colors));
    expect(theme.pageText).toBe('var(--color-pageText)');
  });

  it('includes the fallback when a token has one', () => {
    expect(theme.tableRowBackgroundAlternate).toBe(
      'var(--color-tableRowBackgroundAlternate, var(--color-tableBackground))',
    );
  });
});

describe('generateThemeCss', () => {
  it('rejects an unknown palette color', () => {
    expect(() =>
      generateThemeCss('light', { a: { all: 'nope' as never } }, palette),
    ).toThrow('unknown palette color "nope"');
  });

  it('rejects a reference to a missing token', () => {
    expect(() =>
      generateThemeCss('light', { a: { all: { ref: 'missing' } } }, palette),
    ).toThrow('unknown token "missing"');
  });

  it('rejects a fallback to a missing token', () => {
    expect(() =>
      generateThemeCss(
        'light',
        { a: { all: 'white', fallback: 'missing' } },
        palette,
      ),
    ).toThrow('unknown token "missing"');
  });
});
