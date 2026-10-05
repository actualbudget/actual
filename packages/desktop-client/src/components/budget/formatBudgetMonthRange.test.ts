import { formatBudgetMonthRange } from './formatBudgetMonthRange';

describe('formatBudgetMonthRange', () => {
  it('shows the full month name and year for a single month', () => {
    expect(formatBudgetMonthRange('2026-10', 1)).toBe('October 2026');
  });

  it('shows the year once when the range stays within a year', () => {
    expect(formatBudgetMonthRange('2026-10', 2)).toBe('Oct – Nov 2026');
    expect(formatBudgetMonthRange('2026-01', 6)).toBe('Jan – Jun 2026');
  });

  it('shows both years when the range crosses into the next year', () => {
    expect(formatBudgetMonthRange('2026-12', 2)).toBe('Dec 2026 – Jan 2027');
    expect(formatBudgetMonthRange('2026-10', 6)).toBe('Oct 2026 – Mar 2027');
  });
});
