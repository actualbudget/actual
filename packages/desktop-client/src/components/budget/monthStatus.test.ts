import { getMonthStatus } from './monthStatus';

describe('getMonthStatus', () => {
  it('marks months before the current month as past', () => {
    expect(getMonthStatus('2026-09', '2026-10')).toBe('past');
    expect(getMonthStatus('2025-12', '2026-01')).toBe('past');
  });

  it('marks the current month as current', () => {
    expect(getMonthStatus('2026-10', '2026-10')).toBe('current');
  });

  it('marks months after the current month as future', () => {
    expect(getMonthStatus('2026-11', '2026-10')).toBe('future');
    expect(getMonthStatus('2027-01', '2026-12')).toBe('future');
  });
});
