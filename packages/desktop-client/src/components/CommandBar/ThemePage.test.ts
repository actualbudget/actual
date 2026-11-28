import { describe, expect, it } from 'vitest';

import { isThemePageEscape, translateBuiltinThemeRows } from './ThemePage';

describe('ThemePage foundation behavior', () => {
  it('intercepts Escape only on the nested theme page', () => {
    expect(isThemePageEscape('Escape', 'themes')).toBe(true);
    expect(isThemePageEscape('Escape', 'root')).toBe(false);
    expect(isThemePageEscape('Enter', 'themes')).toBe(false);
  });

  it('translates built-in labels before filtering and highlighting', () => {
    const rows = translateBuiltinThemeRows(name => `translated:${name}`);
    expect(rows).toHaveLength(4);
    expect(rows.map(row => row.name)).toEqual([
      'translated:Light',
      'translated:Dark',
      'translated:Midnight',
      'translated:System default',
    ]);
  });

  it('resolves the six built-in theme preview swatches', () => {
    const rows = translateBuiltinThemeRows(name => name);
    expect(rows.map(row => row.swatches)).toHaveLength(4);
    expect(rows.every(row => row.swatches.length === 6)).toBe(true);
    expect(rows[0].swatches).toEqual([
      '#e8ecf0',
      '#ffffff',
      '#272630',
      '#8719e0',
      '#00795a',
      '#d1162c',
    ]);
  });
});
