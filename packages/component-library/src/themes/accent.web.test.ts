import { wcagContrast } from 'culori';

import { deriveAccentCss } from './accent';
import { palette } from './source/palette';

import { darkThemeCss, lightThemeCss } from './index';

function declarations(css: string | null) {
  return Object.fromEntries(
    [...(css ?? '').matchAll(/--color-([A-Za-z0-9]+): ([^;]+);/g)].map(
      match => [match[1], match[2]],
    ),
  );
}

describe('deriveAccentCss', () => {
  it('does nothing for a theme that sets no accent input', () => {
    expect(deriveAccentCss('light', ':root { --color-pageText: #111; }')).toBe(
      null,
    );
    expect(deriveAccentCss('light', '')).toBe(null);
  });

  it('derives the rest of the set from a custom accent', () => {
    const derived = declarations(
      deriveAccentCss('light', ':root { --color-accent: #0a7d5a; }'),
    );

    expect(Object.keys(derived)).toEqual([
      'accentContrast',
      'accentHover',
      'accentText',
      'accentBorder',
      'accentSubtle',
      'accentSubtleText',
      'sidebarItemAccentSelected',
      'menuItemTextHeader',
      'menuKeybindingText',
      'menuAutoCompleteTextHeader',
      'pillTextHighlighted',
    ]);
    expect(derived.accentContrast).toBe('#ffffff');
    expect(wcagContrast(derived.accentText, '#ffffff')).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('keeps the sidebar selection readable on the sidebar for any accent', () => {
    for (const accent of ['#0a7d5a', '#ffd84d', '#1a1a1a', '#d32f2f']) {
      const derived = declarations(
        deriveAccentCss('light', `:root { --color-accent: ${accent}; }`),
      );
      expect(
        wcagContrast(derived.sidebarItemAccentSelected, palette.navy900),
        accent,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('works out the sidebar selection against a sidebar the theme sets', () => {
    const derived = declarations(
      deriveAccentCss('light', ':root { --color-sidebarBackground: #ffffff; }'),
    );

    expect(
      wcagContrast(derived.sidebarItemAccentSelected, '#ffffff'),
    ).toBeGreaterThanOrEqual(7);
  });

  it('matches the built-in values when given the built-in accent', () => {
    const builtIn = declarations(lightThemeCss);
    const derived = declarations(
      deriveAccentCss('light', ':root { --color-accent: #8719e0; }'),
    );

    expect(Object.keys(derived)).toHaveLength(11);
    for (const [name, value] of Object.entries(derived)) {
      expect(value).toBe(builtIn[name]);
    }
  });

  it('keeps the values a theme sets itself', () => {
    const derived = declarations(
      deriveAccentCss(
        'light',
        ':root { --color-accent: #0a7d5a; --color-accentHover: #123456; }',
      ),
    );

    expect(derived.accentHover).toBeUndefined();
    expect(derived.accentText).toBeDefined();
  });

  it('re-derives against a custom surface with the built-in accent', () => {
    const derived = declarations(
      deriveAccentCss(
        'light',
        ':root { --color-tableBackground: #101418; --color-pageBackground: #000000; }',
      ),
    );

    expect(wcagContrast(derived.accentText, '#101418')).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(derived.accentText).not.toBe(declarations(lightThemeCss).accentText);
  });

  it('follows references to other tokens', () => {
    const viaReference = deriveAccentCss(
      'dark',
      ':root { --color-buttonPrimaryBackground: rgb(10, 125, 90); --color-accent: var(--color-buttonPrimaryBackground); }',
    );
    const direct = deriveAccentCss(
      'dark',
      ':root { --color-accent: #0a7d5a; }',
    );

    expect(viaReference).toBe(direct);
  });

  it('resolves a reference to a built-in token', () => {
    const noticeBackground = declarations(darkThemeCss).noticeBackground;
    expect(noticeBackground).toBe('var(--palette-green800)');

    expect(
      deriveAccentCss(
        'dark',
        ':root { --color-accent: var(--color-noticeBackground); }',
      ),
    ).toBe(
      deriveAccentCss('dark', `:root { --color-accent: ${palette.green800}; }`),
    );
  });

  it("follows a theme's own variables and palette colors", () => {
    const direct = deriveAccentCss(
      'light',
      ':root { --color-accent: #0a7d5a; }',
    );

    expect(
      deriveAccentCss(
        'light',
        ':root { --brand-green: #0a7d5a; --color-accent: VAR( --brand-green ); }',
      ),
    ).toBe(direct);
    expect(
      deriveAccentCss(
        'light',
        ':root { --color-accent: var(--palette-purple500); }',
      ),
    ).toBe(deriveAccentCss('light', ':root { --color-accent: #8719e0; }'));
  });

  it("falls back to the built-in surface when a theme's surface is unreadable", () => {
    expect(
      deriveAccentCss(
        'light',
        ':root { --color-accent: #0a7d5a; --color-tableBackground: var(--nope); }',
      ),
    ).toBe(deriveAccentCss('light', ':root { --color-accent: #0a7d5a; }'));
  });

  it('treats translucent colors as they appear over the surface', () => {
    const translucent = declarations(
      deriveAccentCss(
        'light',
        ':root { --color-accent: rgba(135, 25, 224, 0.15); }',
      ),
    );
    expect(translucent.accentContrast).toBe('#000000');

    const surface = declarations(
      deriveAccentCss(
        'light',
        ':root { --color-tableBackground: rgba(0, 0, 0, 0.05); }',
      ),
    );
    expect(wcagContrast(surface.accentSubtle, '#ffffff')).toBeLessThan(1.5);
  });

  it('survives names that exist on every object', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'valueOf']) {
      expect(
        deriveAccentCss(
          'light',
          `:root { --color-accent: var(--color-${name}); }`,
        ),
      ).toBe(null);
      expect(
        deriveAccentCss(
          'light',
          `:root { --color-accent: #0a7d5a; --color-pageBackground: var(--color-${name}); }`,
        ),
      ).toBe(deriveAccentCss('light', ':root { --color-accent: #0a7d5a; }'));
    }
  });

  it('does not read a bare number as a color', () => {
    expect(deriveAccentCss('light', ':root { --color-accent: 123; }')).toBe(
      null,
    );
  });

  it('gives up on values it cannot read', () => {
    expect(
      deriveAccentCss('light', ':root { --color-accent: var(--color-nope); }'),
    ).toBe(null);
    expect(
      deriveAccentCss(
        'light',
        ':root { --color-a: var(--color-b); --color-b: var(--color-a); --color-accent: var(--color-a); }',
      ),
    ).toBe(null);
  });

  it('reads the last declaration when a later layer overrides', () => {
    const layered = deriveAccentCss(
      'light',
      ':root { --color-accent: #0a7d5a; }\n:root { --color-accent: #b3261e; }',
    );

    expect(layered).toBe(
      deriveAccentCss('light', ':root { --color-accent: #b3261e; }'),
    );
  });

  it('works out the tint text against a tint the theme sets itself', () => {
    const withoutTint = declarations(
      deriveAccentCss('light', ':root { --color-accent: #000000; }'),
    );
    const withTint = declarations(
      deriveAccentCss(
        'light',
        ':root { --color-accent: #000000; --color-accentSubtle: #000000; }',
      ),
    );

    expect(withTint.accentSubtle).toBeUndefined();
    expect(
      wcagContrast(withTint.accentSubtleText, '#000000'),
    ).toBeGreaterThanOrEqual(4.5);
    expect(withTint.accentText).toBe(withoutTint.accentText);
  });

  it('works out the tint text for a theme that only sets the tint', () => {
    const derived = declarations(
      deriveAccentCss('dark', ':root { --color-accentSubtle: #f4e9ff; }'),
    );

    expect(
      wcagContrast(derived.accentSubtleText, '#f4e9ff'),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('reads minified css and declarations that follow a comment', () => {
    const expected = deriveAccentCss(
      'light',
      ':root { --color-accent: #0a7d5a; }',
    );

    expect(deriveAccentCss('light', ':root{--color-accent:#0a7d5a}')).toBe(
      expected,
    );
    expect(
      deriveAccentCss(
        'light',
        ':root {\n  /* brand */ --color-accent: #0a7d5a;\n}',
      ),
    ).toBe(expected);
  });

  it('reads a long run of dashes quickly', () => {
    const start = performance.now();

    expect(deriveAccentCss('light', '-'.repeat(200_000))).toBe(null);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
