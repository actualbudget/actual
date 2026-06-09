import { rangeInclusive } from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { isBaseCategory } from './budget-analysis-spreadsheet';

const makeCategory = (
  overrides: Partial<CategoryEntity> & Pick<CategoryEntity, 'id' | 'name'>,
): CategoryEntity => ({
  is_income: false,
  hidden: false,
  group: 'group1',
  ...overrides,
});

const visibleExpense = makeCategory({ id: 'c1', name: 'Groceries' });
const hiddenExpense = makeCategory({
  id: 'c2',
  name: 'Car Fund',
  hidden: true,
});
const incomeCategory = makeCategory({
  id: 'c3',
  name: 'Salary',
  is_income: true,
});
const hiddenIncome = makeCategory({
  id: 'c4',
  name: 'Hidden Income',
  is_income: true,
  hidden: true,
});

const all = [visibleExpense, hiddenExpense, incomeCategory, hiddenIncome];

function filterBaseCategories(
  categories: CategoryEntity[],
  showHiddenCategories: boolean,
): CategoryEntity[] {
  return categories.filter(cat => isBaseCategory(cat, showHiddenCategories));
}

describe('createBudgetAnalysisSpreadsheet', () => {
  describe('hidden category filtering', () => {
    it('excludes hidden categories when showHiddenCategories is false', () => {
      const result = filterBaseCategories(all, false);
      expect(result).toContain(visibleExpense);
      expect(result).not.toContain(hiddenExpense);
    });

    it('includes hidden expense categories when showHiddenCategories is true', () => {
      const result = filterBaseCategories(all, true);
      expect(result).toContain(visibleExpense);
      expect(result).toContain(hiddenExpense);
    });

    it('always excludes income categories regardless of showHiddenCategories', () => {
      const resultFalse = filterBaseCategories(all, false);
      const resultTrue = filterBaseCategories(all, true);
      expect(resultFalse).not.toContain(incomeCategory);
      expect(resultFalse).not.toContain(hiddenIncome);
      expect(resultTrue).not.toContain(incomeCategory);
      expect(resultTrue).not.toContain(hiddenIncome);
    });

    it('returns only visible expense categories by default', () => {
      const result = filterBaseCategories(all, false);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(visibleExpense);
    });

    it('returns all expense categories when flag is true', () => {
      const result = filterBaseCategories(all, true);
      expect(result).toHaveLength(2);
      expect(result).toContain(visibleExpense);
      expect(result).toContain(hiddenExpense);
    });
  });

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
      const range = rangeInclusive(current, futureMonth);

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

      const allMonths = rangeInclusive(current, futureMonth)
        .map(month => ({ name: month }))
        .reverse();

      expect(allMonths[0].name).toBe(futureMonth);
      expect(allMonths[allMonths.length - 1].name).toBe(current);
    });
  });
});
