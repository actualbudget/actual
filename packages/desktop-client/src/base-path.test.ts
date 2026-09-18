import { describe, expect, it } from 'vitest';

import {
  escapeRegExp,
  getBasePath,
  stripBasePath,
  withBasePath,
} from './base-path';

describe('base path', () => {
  it('normalizes a configured subpath and prefixes browser URLs', () => {
    expect(getBasePath('/finances/')).toBe('/finances');
    expect(getBasePath('/')).toBe('');
    expect(withBasePath('/finances/', '/static/app.js')).toBe(
      '/finances/static/app.js',
    );
    expect(withBasePath('/', '/static/app.js')).toBe('/static/app.js');
  });

  it('rejects unsafe or ambiguous configured paths', () => {
    expect(() => getBasePath('../x')).toThrow(/ACTUAL_BASE_PATH/);
    expect(() => getBasePath('/finances?x=1')).toThrow(/ACTUAL_BASE_PATH/);
    expect(() => getBasePath('/finance#x')).toThrow(/ACTUAL_BASE_PATH/);
    expect(() => getBasePath('/finance path')).toThrow(/ACTUAL_BASE_PATH/);
  });

  it('escapes regex metacharacters in configured paths', () => {
    for (const [basePath, nearPath] of [
      ['/cash+flow', '/cashxflow'],
      ['/a.b', '/axb'],
    ]) {
      const matcher = new RegExp(`^${escapeRegExp(basePath)}account/.*$`);
      expect(matcher.test(`${basePath}account/settings`)).toBe(true);
      expect(matcher.test(`${nearPath}account/settings`)).toBe(false);
    }
  });

  it('strips only the configured prefix from browser paths', () => {
    expect(stripBasePath('/finances', '/finances/budget')).toBe('/budget');
    expect(stripBasePath('/finances', '/finance/budget')).toBe(
      '/finance/budget',
    );
  });
});
