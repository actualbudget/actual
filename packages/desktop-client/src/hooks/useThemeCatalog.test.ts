import { describe, expect, it } from 'vitest';

import { isCatalogTheme } from './useThemeCatalog';

describe('isCatalogTheme', () => {
  it('accepts valid catalog entries including optional colors', () => {
    expect(
      isCatalogTheme({ name: 'Theme', repo: 'owner/theme', mode: 'dark' }),
    ).toBe(true);
    expect(
      isCatalogTheme({
        name: 'Theme',
        repo: 'owner/theme',
        mode: 'light',
        colors: ['#fff'],
      }),
    ).toBe(true);
  });

  it.each([
    null,
    {},
    { repo: 'owner/theme', mode: 'dark' },
    { name: 'Theme', mode: 'dark' },
    { name: 'Theme', repo: 'owner/theme' },
    { name: 'Theme', repo: 'owner/theme', mode: 'auto' },
    { name: 'Theme', repo: 'owner/theme', mode: 'dark', colors: [1] },
  ])('rejects malformed entries: %j', value => {
    expect(isCatalogTheme(value)).toBe(false);
  });
});
