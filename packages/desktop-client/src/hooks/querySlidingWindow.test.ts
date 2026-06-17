import { describe, expect, it } from 'vitest';

import { getLiveSlidingWindowRange } from './querySlidingWindow';

describe('getLiveSlidingWindowRange', () => {
  it('keeps a month-only sliding window anchored to the current day', () => {
    expect(
      getLiveSlidingWindowRange('2024-01', '2024-03', '2025-06-16'),
    ).toEqual({
      startDate: '2025-04-01',
      endDate: '2025-06-16',
    });
  });

  it('keeps a day-level sliding window anchored to the current day', () => {
    expect(
      getLiveSlidingWindowRange('2024-01-01', '2024-03-31', '2025-06-16'),
    ).toEqual({
      startDate: '2025-04-01',
      endDate: '2025-06-16',
    });
  });

  it('treats a same-month window as the current month to date', () => {
    expect(
      getLiveSlidingWindowRange('2024-03-01', '2024-03-31', '2025-06-16'),
    ).toEqual({
      startDate: '2025-06-01',
      endDate: '2025-06-16',
    });
  });
});
