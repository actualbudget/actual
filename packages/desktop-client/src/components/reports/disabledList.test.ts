import { describe, expect, it, vi } from 'vitest';

import { disabledList } from './disabledList';

vi.mock('i18next', () => ({
  t: (key: string) => `translated:${key}`,
}));

describe('disabledList.currentInterval', () => {
  it('keys fixed ranges by untranslated range id regardless of locale', () => {
    expect(disabledList.currentInterval.get('Last month')).toBe(true);
    expect(disabledList.currentInterval.get('Previous quarter')).toBe(true);
    expect(disabledList.currentInterval.get('Last 6 months')).toBeUndefined();
  });
});
