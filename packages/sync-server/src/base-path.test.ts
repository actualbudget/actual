import { describe, expect, it } from 'vitest';

import { normalizeBasePath } from './base-path';

describe('sync-server base path', () => {
  it('normalizes the same safe path contract as the web client', () => {
    expect(normalizeBasePath('/finances/')).toBe('/finances');
    expect(normalizeBasePath('/')).toBe('');
    expect(() => normalizeBasePath('../x')).toThrow(/ACTUAL_BASE_PATH/);
    expect(() => normalizeBasePath('/finances?x=1')).toThrow(
      /ACTUAL_BASE_PATH/,
    );
    expect(() => normalizeBasePath('/finance path')).toThrow(
      /ACTUAL_BASE_PATH/,
    );
  });
});
