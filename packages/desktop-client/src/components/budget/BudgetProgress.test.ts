import { describe, expect, it } from 'vitest';

import { getUsageProgress } from './BudgetProgress';

describe('getUsageProgress', () => {
  it('skips usage when there is no budget', () => {
    expect(getUsageProgress(0, -25)).toBeNull();
  });

  it('maps normal spending to ten dashes', () => {
    expect(getUsageProgress(100, -50)).toEqual({
      percent: 0.5,
      normalFilled: 5,
      overflowLines: [],
    });
  });

  it('adds overflow rows for overspending', () => {
    expect(getUsageProgress(100, -225)).toEqual({
      percent: 2.25,
      normalFilled: 10,
      overflowLines: [10, 3],
    });
  });
});
