import { describe, expect, it, vi } from 'vitest';

import { translateBuiltInDashboardName } from './defaultDashboardNames';

describe('translateBuiltInDashboardName', () => {
  it('translates names seeded on the built-in dashboard', () => {
    const t = vi.fn(key => `sv:${key}`);

    expect(translateBuiltInDashboardName('Total Income (YTD)', t)).toBe(
      'sv:Total Income (YTD)',
    );
    expect(t).toHaveBeenCalledWith('Total Income (YTD)');
  });

  it('preserves a custom dashboard name', () => {
    const t = vi.fn();

    expect(translateBuiltInDashboardName('Månadsöversikt', t)).toBe(
      'Månadsöversikt',
    );
    expect(t).not.toHaveBeenCalled();
  });
});
