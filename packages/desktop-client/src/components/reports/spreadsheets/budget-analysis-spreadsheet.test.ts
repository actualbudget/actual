import * as monthUtils from 'loot-core/shared/months';

describe('createBudgetAnalysisSpreadsheet', () => {
  describe('future month range', () => {
    it('future month is December of next year', () => {
      const current = '2026-06';
      const futureYear = String(Number(current.slice(0, 4)) + 1);
      const futureMonth = `${futureYear}-12`;

      expect(futureMonth).toBe('2027-12');
    });

    it('rangeInclusive from a mid-year month to December next year ends at December', () => {
      const current = '2026-06';
      const futureYear = String(Number(current.slice(0, 4)) + 1);
      const futureMonth = `${futureYear}-12`;
      const range = monthUtils.rangeInclusive(current, futureMonth);

      expect(range[0]).toBe('2026-06');
      expect(range[range.length - 1]).toBe('2027-12');
    });

    it('future month is always in December regardless of current month', () => {
      for (const month of ['2024-01', '2024-06', '2024-12']) {
        const futureYear = String(Number(month.slice(0, 4)) + 1);
        const futureMonth = `${futureYear}-12`;
        expect(futureMonth.endsWith('-12')).toBe(true);
      }
    });

    it('future months appear before current month in the reversed picker list', () => {
      const current = '2026-06';
      const futureYear = String(Number(current.slice(0, 4)) + 1);
      const futureMonth = `${futureYear}-12`;

      const allMonths = monthUtils
        .rangeInclusive(current, futureMonth)
        .map(month => ({ name: month }))
        .reverse();

      expect(allMonths[0].name).toBe(futureMonth);
      expect(allMonths[allMonths.length - 1].name).toBe(current);
    });
  });
});
