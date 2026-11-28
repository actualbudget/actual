import { clampChroma, formatHex, wcagContrast } from 'culori';

import { colors } from './colors';
import {
  accentSurfaceTokens,
  deriveAccent,
  deriveStatus,
  nearestWithContrast,
  shapeContrast,
  strongTextContrast,
  textContrast,
} from './derive';
import { palette } from './palette';
import { resolveToken, toHex } from './resolve';
import { themeNames } from './types';
import type { ThemeName } from './types';

function surfacesOf(theme: ThemeName) {
  const hex = (name: string) =>
    toHex(resolveToken(name, theme, colors, palette));
  return {
    surface: hex(accentSurfaceTokens.surface),
    page: hex(accentSurfaceTokens.page),
    mobilePage: hex(accentSurfaceTokens.mobilePage),
  };
}

const sweep = [
  [0.52, 0.26],
  [0.4, 0.18],
  [0.65, 0.2],
  [0.8, 0.14],
  [0.9, 0.1],
  [0.3, 0.1],
  [0.55, 0.05],
].flatMap(([lightness, chroma]) =>
  Array.from({ length: 24 }, (_, index) =>
    formatHex(
      clampChroma(
        { mode: 'oklch', l: lightness, c: chroma, h: index * 15 },
        'oklch',
        'rgb',
      ),
    ),
  ),
);

describe('deriveAccent', () => {
  it('keeps the accent as given', () => {
    const accentSet = deriveAccent('#8719E0', surfacesOf('light'));
    expect(accentSet.accent).toBe('#8719e0');
  });

  it('puts white on a deep accent and black on a pale one', () => {
    const surfaces = surfacesOf('light');
    expect(deriveAccent('#8719e0', surfaces).accentContrast).toBe('#ffffff');
    expect(deriveAccent('#ffd84d', surfaces).accentContrast).toBe('#000000');
  });

  it('moves the hover fill away from the text on it', () => {
    const surfaces = surfacesOf('light');
    const deep = deriveAccent('#8719e0', surfaces);
    const pale = deriveAccent('#ffd84d', surfaces);
    expect(wcagContrast(deep.accentContrast, deep.accentHover)).toBeGreaterThan(
      wcagContrast(deep.accentContrast, deep.accent),
    );
    expect(wcagContrast(pale.accentContrast, pale.accentHover)).toBeGreaterThan(
      wcagContrast(pale.accentContrast, pale.accent),
    );
  });

  it('still changes on hover at the ends of the lightness range', () => {
    const surfaces = surfacesOf('light');
    for (const accent of ['#000000', '#ffffff', '#ffff00']) {
      const accentSet = deriveAccent(accent, surfaces);
      expect(accentSet.accentHover).not.toBe(accentSet.accent);
    }
  });

  it('keeps accent text readable on its own tint', () => {
    for (const theme of themeNames) {
      const accentSet = deriveAccent('#9446ed', surfacesOf(theme));
      expect(
        wcagContrast(accentSet.accentText, accentSet.accentSubtle),
      ).toBeGreaterThanOrEqual(textContrast);
    }
  });

  it('does its best when the page and the surface pull in opposite directions', () => {
    const accentSet = deriveAccent('#8719e0', {
      surface: '#ffffff',
      page: '#000000',
      mobilePage: '#ffffff',
    });
    expect(wcagContrast(accentSet.accentText, '#ffffff')).toBeGreaterThan(3);
    expect(wcagContrast(accentSet.accentText, '#000000')).toBeGreaterThan(3);
  });

  it('uses the accent itself as text where it already reads', () => {
    const accentSet = deriveAccent('#8719e0', surfacesOf('light'));
    expect(accentSet.accentText).toBe('#8719e0');
    expect(accentSet.accentBorder).toBe('#8719e0');
  });

  it('lightens the accent for text on a dark surface', () => {
    const surfaces = surfacesOf('dark');
    const accentSet = deriveAccent('#8719e0', surfaces);
    expect(accentSet.accentText).not.toBe('#8719e0');
    expect(
      wcagContrast(accentSet.accentText, surfaces.surface),
    ).toBeGreaterThanOrEqual(textContrast);
  });

  it('tints the surface with the accent', () => {
    const light = deriveAccent('#8719e0', surfacesOf('light'));
    expect(wcagContrast(light.accentSubtle, '#ffffff')).toBeLessThan(1.5);
    expect(wcagContrast(light.accentSubtle, '#ffffff')).toBeGreaterThan(1.1);
  });

  describe.each(themeNames)('on the %s surfaces', theme => {
    const { surface, page, mobilePage } = surfacesOf(theme);

    it.each(sweep)('%s meets every target', accent => {
      const accentSet = deriveAccent(accent, { surface, page, mobilePage });
      const ratios = {
        contrastOnAccent: wcagContrast(
          accentSet.accentContrast,
          accentSet.accent,
        ),
        contrastOnHover: wcagContrast(
          accentSet.accentContrast,
          accentSet.accentHover,
        ),
        textOnSurface: wcagContrast(accentSet.accentText, surface),
        textOnPage: wcagContrast(accentSet.accentText, page),
        textOnMobilePage: wcagContrast(accentSet.accentText, mobilePage),
        subtleTextOnSubtle: wcagContrast(
          accentSet.accentSubtleText,
          accentSet.accentSubtle,
        ),
        borderOnSurface: wcagContrast(accentSet.accentBorder, surface),
        borderOnPage: wcagContrast(accentSet.accentBorder, page),
      };

      expect(ratios.contrastOnAccent).toBeGreaterThanOrEqual(textContrast);
      expect(ratios.contrastOnHover).toBeGreaterThanOrEqual(textContrast);
      expect(ratios.textOnSurface).toBeGreaterThanOrEqual(textContrast);
      expect(ratios.textOnPage).toBeGreaterThanOrEqual(textContrast);
      expect(ratios.textOnMobilePage).toBeGreaterThanOrEqual(textContrast);
      expect(ratios.subtleTextOnSubtle).toBeGreaterThanOrEqual(textContrast);
      expect(ratios.borderOnSurface).toBeGreaterThanOrEqual(shapeContrast);
      expect(ratios.borderOnPage).toBeGreaterThanOrEqual(shapeContrast);
    });
  });
});

describe('deriveStatus', () => {
  it('makes a pale fill on a light table and a deep one on a dark table', () => {
    const onLight = deriveStatus('#27ab83', surfacesOf('light'));
    const onDark = deriveStatus('#27ab83', surfacesOf('dark'));

    expect(wcagContrast(onLight.fill, '#ffffff')).toBeLessThan(1.3);
    expect(wcagContrast(onDark.fill, '#ffffff')).toBeGreaterThan(4);
    expect(wcagContrast(onLight.fillSubtle, '#ffffff')).toBeLessThan(
      wcagContrast(onLight.fill, '#ffffff'),
    );
    expect(wcagContrast(onDark.fillSubtle, '#ffffff')).toBeGreaterThan(
      wcagContrast(onDark.fill, '#ffffff'),
    );
  });

  describe.each(themeNames)('on the %s theme', theme => {
    const surfaces = surfacesOf(theme);
    const backgrounds = [surfaces.surface, surfaces.page, surfaces.mobilePage];
    const lowest = (color: string, fill: string) =>
      Math.min(
        ...[...backgrounds, fill].map(background =>
          wcagContrast(color, background),
        ),
      );

    it.each(sweep)('keeps %s readable on its fills and the surfaces', input => {
      const status = deriveStatus(input, surfaces);

      expect(lowest(status.text, status.fill)).toBeGreaterThanOrEqual(
        textContrast,
      );
      expect(
        lowest(status.textOnSubtle, status.fillSubtle),
      ).toBeGreaterThanOrEqual(textContrast);
      expect(lowest(status.textStrong, status.fill)).toBeGreaterThanOrEqual(
        strongTextContrast,
      );
    });
  });
});

describe('nearestWithContrast', () => {
  it('returns the color unchanged when it already passes', () => {
    expect(nearestWithContrast('#000000', ['#ffffff'], 4.5)).toBe('#000000');
  });

  it('returns the strongest option when no lightness can pass', () => {
    const color = nearestWithContrast('#8719e0', ['#ffffff', '#000000'], 4.5);
    expect(wcagContrast(color, '#ffffff')).toBeGreaterThan(4);
    expect(wcagContrast(color, '#000000')).toBeGreaterThan(4);
  });
});
